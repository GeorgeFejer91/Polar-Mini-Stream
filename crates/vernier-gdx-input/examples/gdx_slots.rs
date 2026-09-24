//! Read-only BLE inventory of a nearby GDX-RB and all 32 Go Direct sensor slots.

use std::time::Duration;

use btleplug::{
    api::{Central, CharPropFlags, Manager as _, Peripheral as _, ScanFilter, WriteType},
    platform::Manager,
};
use futures_util::StreamExt;
use vernier_gdx_core::{
    COMMAND_CHARACTERISTIC, Command, CommandCounter, Frame, FrameAccumulator,
    GET_AVAILABLE_SENSOR_MASK, RESPONSE_CHARACTERISTIC, decode_frame, decode_sensor_info_response,
    decode_sensor_mask_response,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let manager = Manager::new().await?;
    let adapter = manager
        .adapters()
        .await?
        .into_iter()
        .next()
        .ok_or("No adapter")?;
    adapter.start_scan(ScanFilter::default()).await?;
    tokio::time::sleep(Duration::from_secs(6)).await;
    let devices = adapter.peripherals().await?;
    adapter.stop_scan().await?;
    let mut belt = None;
    for device in devices {
        if device
            .properties()
            .await?
            .and_then(|properties| properties.local_name)
            .is_some_and(|name| name.starts_with("GDX-RB"))
        {
            belt = Some(device);
            break;
        }
    }
    let device = belt.ok_or("No GDX-RB advertising")?;
    device.connect().await?;
    let result = probe(&device).await;
    device.disconnect().await?;
    result
}

async fn probe(device: &btleplug::platform::Peripheral) -> Result<(), Box<dyn std::error::Error>> {
    device.discover_services().await?;
    for service in device.services() {
        println!("service {}", service.uuid);
        for characteristic in service.characteristics {
            println!(
                "  characteristic {} {:?}",
                characteristic.uuid, characteristic.properties
            );
        }
    }
    let command = device
        .characteristics()
        .into_iter()
        .find(|characteristic| characteristic.uuid == COMMAND_CHARACTERISTIC)
        .ok_or("No command characteristic")?;
    let response = device
        .characteristics()
        .into_iter()
        .find(|characteristic| characteristic.uuid == RESPONSE_CHARACTERISTIC)
        .ok_or("No response characteristic")?;
    device.subscribe(&response).await?;
    let mut notifications = device.notifications().await?;
    let mut accumulator = FrameAccumulator::default();
    let mut counter = CommandCounter::default();
    transact(
        device,
        &command,
        &mut notifications,
        &mut accumulator,
        &Command::initialize(&mut counter),
    )
    .await?;
    let available = Command::get_available_sensor_mask(&mut counter);
    let bytes = transact(
        device,
        &command,
        &mut notifications,
        &mut accumulator,
        &available,
    )
    .await?;
    let mask = decode_sensor_mask_response(&bytes, GET_AVAILABLE_SENSOR_MASK)?;
    println!("available mask 0x{mask:08x}");
    for number in 0..32 {
        let request = Command::get_sensor_info(&mut counter, number);
        match transact(
            device,
            &command,
            &mut notifications,
            &mut accumulator,
            &request,
        )
        .await
        {
            Ok(bytes) => match decode_sensor_info_response(&bytes) {
                Ok(sensor) => println!(
                    "slot {number}: channel {} id {} {} ({})",
                    sensor.number, sensor.sensor_id, sensor.description, sensor.unit
                ),
                Err(error) => println!("slot {number}: {}-byte response: {error}", bytes.len()),
            },
            Err(error) => {
                println!("slot {number}: {error}; stopping slot probe");
                break;
            }
        }
    }
    Ok(())
}

async fn transact<S>(
    device: &btleplug::platform::Peripheral,
    characteristic: &btleplug::api::Characteristic,
    notifications: &mut S,
    accumulator: &mut FrameAccumulator,
    command: &Command,
) -> Result<Vec<u8>, Box<dyn std::error::Error>>
where
    S: futures_util::Stream<Item = btleplug::api::ValueNotification> + Unpin,
{
    let mode = if characteristic
        .properties
        .contains(CharPropFlags::WRITE_WITHOUT_RESPONSE)
    {
        WriteType::WithoutResponse
    } else {
        WriteType::WithResponse
    };
    for chunk in command.chunks(20) {
        device.write(characteristic, chunk, mode).await?;
    }
    tokio::time::timeout(Duration::from_secs(2), async {
        loop {
            let notification = notifications.next().await.ok_or("Notifications ended")?;
            if notification.uuid != RESPONSE_CHARACTERISTIC {
                continue;
            }
            for bytes in accumulator.push(&notification.value)? {
                if matches!(decode_frame(&bytes), Ok(Frame::Response(_)))
                    && bytes.get(4) == Some(&command.id)
                    && bytes.get(5) == command.bytes.get(2)
                {
                    return Ok(bytes);
                }
            }
        }
    })
    .await?
}
