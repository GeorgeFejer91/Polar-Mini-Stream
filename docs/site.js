(() => {
  const catalog = window.PolarMetricCatalog;
  const list = document.getElementById('metric-list');
  const search = document.getElementById('search');
  const category = document.getElementById('category');
  const resultCount = document.getElementById('result-count');
  document.getElementById('metric-total').textContent = String(catalog.length);

  for (const name of [...new Set(catalog.map(metric => metric.category))]) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    category.append(option);
  }

  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = value;
    return node;
  };

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const selectedCategory = category.value;
    const matches = catalog.filter(metric => {
      if (selectedCategory !== 'all' && metric.category !== selectedCategory) return false;
      return !query || [metric.id, metric.label, metric.detail, metric.keywords, metric.formula, metric.explainer]
        .some(value => value.toLocaleLowerCase().includes(query));
    });
    list.replaceChildren();
    for (const metric of matches) {
      const card = element('article', 'metric-card');
      card.id = `metric-${metric.id}`;
      const top = element('div', 'metric-top');
      top.append(element('span', 'metric-id', metric.id), element('span', 'metric-category', metric.category));
      card.append(top, element('h3', '', metric.label), element('p', 'metric-detail', metric.detail));
      const formula = element('div', 'metric-formula');
      formula.append(element('code', '', metric.formula));
      card.append(formula);
      const provenance = metric.id === 'raw_force'
        ? 'Vernier Mini · N · force channel in device-defined _rawVernier outlet'
        : `Polar Mini · ${metric.unit} · ${metric.channels} channel${metric.channels === 1 ? '' : 's'} · ${metric.raw ? 'raw' : 'derived'} · input: ${metric.formulaSource} · LSL: _${metric.streamSuffix}`;
      card.append(element('p', 'metric-meta', provenance));
      card.append(element('p', 'metric-explainer', metric.explainer));
      card.append(element('p', 'metric-meta', `Evidence: ${metric.evidence} · ${metric.selectionTier} tier`));
      const sources = element('div', 'sources');
      sources.append(element('span', '', 'Sources'));
      for (const citation of metric.sources) {
        const link = element('a', '', `${citation.label} ↗`);
        link.href = citation.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        sources.append(link);
      }
      card.append(sources);
      list.append(card);
    }
    resultCount.textContent = `${matches.length} of ${catalog.length} catalog entries`;
  }

  search.addEventListener('input', render);
  category.addEventListener('change', render);
  render();
})();
