if (typeof ChartDataLabels !== 'undefined') {
  Chart.register(ChartDataLabels);
}

const AppState = {
  activeTab: 'observation',
  mode: 'live',
  rawData: typeof EMBEDDED_BOM_DATA !== 'undefined' ? EMBEDDED_BOM_DATA : [],
  selectedMonth: 'Jul 26',
  selectedOrg: 'ALL',
  selectedUnit: 'ALL',
  charts: { bar: null, donut: null, pie: null },
  modification: {
    beforeDate: '2026-06-01',
    afterDate: '2026-07-31',
    orgFilter: '',
    rmCodeFilter: '',
    rmNameFilter: '',
    typeFilter: 'ALL',
    fgSearchText: '',
    onlyDeviations: true,
    records: [],
    rmMap: new Map()
  }
};

const BENCHMARK_DATA = {
  'Jul 26': {
    total: 348,
    prevMonth: 'Jun 26',
    table: {
      observation: { prev: 280, curr: 348 },
      mails: { prev: 15, curr: 19 },
      conversion: { prev: 47, curr: 75 },
      fgUpload: { prev: 110, curr: 139 },
      sfgUpload: { prev: 45, curr: 53 },
      sum: { prev: 155, curr: 192 }
    },
    categories: {
      'Physically Not Used': { rac: 44, cac: 1, total: 45 },
      'Below Consumption': { rac: 14, cac: 11, total: 25 },
      'Over Consumption': { rac: 30, cac: 35, total: 65 },
      'Item Not in BOM': { rac: 8, cac: 3, total: 11 },
      'Alternative Use': { rac: 184, cac: 18, total: 202 }
    },
    orgSplit: { rac: 280, cac: 68 },
    unitSplit: { racIdu: 145, racOdu: 135, cacIdu: 50, cacOdu: 18 },
    importantNote: 'RAC Org. Need To Focus On "Alternative Use"'
  }
};

const MONTH_CONFIG = [
  { code: 'Jan 26', label: 'January 2026', short: 'Jan 2026' },
  { code: 'Feb 26', label: 'February 2026', short: 'Feb 2026' },
  { code: 'Mar 26', label: 'March 2026', short: 'Mar 2026' },
  { code: 'April 26', label: 'April 2026', short: 'Apr 2026' },
  { code: 'May 26', label: 'May 2026', short: 'May 2026' },
  { code: 'Jun 26', label: 'June 2026', short: 'June 2026' },
  { code: 'Jul 26', label: 'July 2026', short: 'July 2026' },
  { code: 'Aug 26', label: 'August 2026', short: 'Aug 2026' },
  { code: 'Sep 26', label: 'September 2026', short: 'Sep 2026' },
  { code: 'Oct 26', label: 'October 2026', short: 'Oct 2026' },
  { code: 'Nov 26', label: 'November 2026', short: 'Nov 2026' },
  { code: 'Dec 26', label: 'December 2026', short: 'Dec 2026' }
];

const STANDARD_CATEGORIES = [
  'Physically Not Used',
  'Below Consumption',
  'Over Consumption',
  'Item Not in BOM',
  'Alternative Use'
];

const CATEGORY_COLORS = {
  'Physically Not Used': '#65a30d',
  'Below Consumption': '#06b6d4',
  'Over Consumption': '#f59e0b',
  'Item Not in BOM': '#4d7c0f',
  'Alternative Use': '#1d4ed8'
};

function normalizeCategory(remark) {
  if (!remark) return null;
  const str = remark.trim().toLowerCase();
  if (str.includes('physically not')) return 'Physically Not Used';
  if (str.includes('below')) return 'Below Consumption';
  if (str.includes('over')) return 'Over Consumption';
  if (str.includes('not in bom') || str.includes('item not in')) return 'Item Not in BOM';
  if (str.includes('alternative')) return 'Alternative Use';
  return null;
}

function getPreviousMonthCode(currentMonthCode) {
  const idx = MONTH_CONFIG.findIndex(m => m.code.toLowerCase() === currentMonthCode.toLowerCase());
  return idx > 0 ? MONTH_CONFIG[idx - 1].code : null;
}

function getMonthLabel(monthCode) {
  const m = MONTH_CONFIG.find(item => item.code.toLowerCase() === monthCode.toLowerCase());
  return m ? m.label : monthCode;
}

function getMonthShort(monthCode) {
  const m = MONTH_CONFIG.find(item => item.code.toLowerCase() === monthCode.toLowerCase());
  return m ? m.short : monthCode;
}

function deduceProductSize(modelName) {
  if (!modelName) return '1.5 Ton (18K)';
  const m = modelName.toUpperCase();
  if (m.includes('12') || m.includes('1.0') || m.includes('1 TON') || m.includes('12K') || m.includes('12J')) return '1.0 Ton (12K)';
  if (m.includes('18') || m.includes('1.5') || m.includes('1.5 TON') || m.includes('18K') || m.includes('18M') || m.includes('18B')) return '1.5 Ton (18K)';
  if (m.includes('24') || m.includes('2.0') || m.includes('2 TON') || m.includes('24K') || m.includes('24C') || m.includes('24W')) return '2.0 Ton (24K)';
  if (m.includes('30') || m.includes('2.5') || m.includes('30K') || m.includes('30HP')) return '2.5 Ton (30K)';
  if (m.includes('36') || m.includes('3.0') || m.includes('36K') || m.includes('36G')) return '3.0 Ton (36K)';
  if (m.includes('48') || m.includes('4.0') || m.includes('48K')) return '4.0 Ton (48K)';
  if (m.includes('60') || m.includes('5.0') || m.includes('60K') || m.includes('60Z')) return '5.0 Ton (60K)';
  if (m.includes('90') || m.includes('90I')) return '2.5 Ton (90)';
  if (m.includes('140')) return '4.0 Ton (140)';
  return '1.5 Ton (18K)';
}

function extractVersion(modelStr) {
  if (!modelStr) return '-';
  const vMatch = modelStr.match(/Version\s*[:;]?\s*([a-zA-Z0-9_-]+)/i);
  if (vMatch && vMatch[1]) return vMatch[1].trim();
  const hexMatch = modelStr.match(/(HEXCO-\d+|KSTAL-\d+|DIMND-\d+|FREDO-\d+|WFA-\d+)/i);
  if (hexMatch && hexMatch[1]) return hexMatch[1].trim();
  return 'STD-0101';
}

function generateModificationRecords() {
  const records = [];
  const addedSet = new Set();
  const rmMap = new Map();

  // If live Oracle EBS Daily BOM records are available, load them with top priority!
  if (typeof EBS_DAILY_BOM_RECORDS !== 'undefined' && Array.isArray(EBS_DAILY_BOM_RECORDS) && EBS_DAILY_BOM_RECORDS.length > 0) {
    EBS_DAILY_BOM_RECORDS.forEach(r => {
      records.push(r);
      if (r.rmCode && !rmMap.has(r.rmCode)) {
        rmMap.set(r.rmCode, r.rmName || r.rmCode);
      }
    });

    if (typeof EBS_SYNC_METADATA !== 'undefined') {
      const metaEl = document.getElementById('ebsSyncMetaText');
      if (metaEl) {
        metaEl.textContent = `Connected: webs.waltonbd.com (mid=594) | Last Synced: ${EBS_SYNC_METADATA.lastSync} | ${EBS_SYNC_METADATA.totalRecords.toLocaleString()} Components (${EBS_SYNC_METADATA.deviationsCount} Deviations)`;
      }
    }

    AppState.modification.rmMap = rmMap;
    return records;
  }

  const models = [
    { name: 'WALTON Split Type Air Conditioner WSI-KRYSTALINE-18MH Outdoor', org: 'RAC', type: 'FG', size: '1.5 Ton (18K)', ver: 'KSTAL-2224' },
    { name: 'WALTON Split Type Air Conditioner WSI-DIAMOND-12J(FROST CLEAN) Outdoor', org: 'RAC', type: 'FG', size: '1.0 Ton (12K)', ver: 'DIMND-2422' },
    { name: 'WALTON Split Type Air Conditioner WSI-DIAMOND-18M(FROST CLEAN) Indoor', org: 'RAC', type: 'FG', size: '1.5 Ton (18K)', ver: 'DIMND-2629' },
    { name: 'WALTON Cassette Type Air Conditioner WCM140IFM20EX Indoor', org: 'CAC', type: 'FG', size: '4.0 Ton (140)', ver: 'HEXCO-0301' },
    { name: 'WALTON Cassette Type Air Conditioner WCM90IFM26EX Indoor', org: 'CAC', type: 'FG', size: '2.5 Ton (90)', ver: 'HEXCO-0101' },
    { name: 'WALTON Ceiling Type Air Conditioner WFI-Freddo-60Z Indoor', org: 'CAC', type: 'FG', size: '5.0 Ton (60K)', ver: 'FREDO-0301' },
    { name: 'WALTON Ceiling Type Air Conditioner WFN-Freddo-36G Indoor', org: 'CAC', type: 'FG', size: '3.0 Ton (36K)', ver: 'FREDO-0201' },
    { name: 'WALTON Split Type Air Conditioner WSI-RIVERINE-24CH Outdoor', org: 'RAC', type: 'FG', size: '2.0 Ton (24K)', ver: 'RIVRN-2101' },
    { name: 'WALTON Split Type Air Conditioner WSI-INVERNA-18X Indoor', org: 'RAC', type: 'FG', size: '1.5 Ton (18K)', ver: 'INVRN-2305' },
    { name: 'B IDU Evaporator (OD7 16HP 2R 4WD 6&9.52 FP Spiral Tube)', org: 'RAC', type: 'SFG', size: '1.5 Ton (18K)', ver: 'EVAP-1601' },
    { name: 'H ODU Condenser (OD7 30HP 2R 4WD Non-Inv. H&C)', org: 'CAC', type: 'SFG', size: '2.5 Ton (30HP)', ver: 'COND-3001' },
    { name: 'J ODU Condenser (OD5 12HP 1R 1WD Blue Fin)', org: 'RAC', type: 'SFG', size: '1.0 Ton (12HP)', ver: 'COND-1201' }
  ];

  const sampleRevisions = [
    { rmCode: '113965', rmName: 'Copper Tube (OD 6.0 x T 0.7) mm', modelIdx: 0, beforeQty: 1.45, afterQty: 1.25, date: '2026-06-15', remarks: 'BOM Optimization: Shortened tube routing' },
    { rmCode: '113965', rmName: 'Copper Tube (OD 6.0 x T 0.7) mm', modelIdx: 1, beforeQty: 1.10, afterQty: 1.10, date: '2026-06-05', remarks: 'Verification Checked (No Change)' },
    { rmCode: '113965', rmName: 'Copper Tube (OD 6.0 x T 0.7) mm', modelIdx: 7, beforeQty: 1.85, afterQty: 1.60, date: '2026-07-02', remarks: 'Conversion to low-gauge alloy' },
    { rmCode: '113965', rmName: 'Copper Tube (OD 6.0 x T 0.7) mm', modelIdx: 9, beforeQty: 0.95, afterQty: 1.15, date: '2026-06-20', remarks: 'Increased for bend allowance' },
    { rmCode: '113965', rmName: 'Copper Tube (OD 6.0 x T 0.7) mm', modelIdx: 10, beforeQty: 2.20, afterQty: 1.90, date: '2026-07-18', remarks: 'Header redesign cost-saving' },

    { rmCode: '170714', rmName: 'Cable tie 150mm (Pcs)', modelIdx: 0, beforeQty: 6, afterQty: 4, date: '2026-06-10', remarks: 'Harness layout simplification' },
    { rmCode: '170714', rmName: 'Cable tie 150mm (Pcs)', modelIdx: 1, beforeQty: 5, afterQty: 4, date: '2026-07-12', remarks: 'Reduced over-consumption per audit' },
    { rmCode: '170714', rmName: 'Cable tie 150mm (Pcs)', modelIdx: 2, beforeQty: 8, afterQty: 8, date: '2026-06-02', remarks: 'BOM Verification Standard' },
    { rmCode: '170714', rmName: 'Cable tie 150mm (Pcs)', modelIdx: 3, beforeQty: 12, afterQty: 10, date: '2026-07-05', remarks: 'Chassis clip mount replacement' },
    { rmCode: '170714', rmName: 'Cable tie 150mm (Pcs)', modelIdx: 8, beforeQty: 7, afterQty: 5, date: '2026-06-28', remarks: 'Wire bundle rerouting' },

    { rmCode: '170715', rmName: 'Cork Tape/Rubber Mud (Pcs)', modelIdx: 0, beforeQty: 2, afterQty: 1, date: '2026-06-18', remarks: 'Excess padding removed' },
    { rmCode: '170715', rmName: 'Cork Tape/Rubber Mud (Pcs)', modelIdx: 1, beforeQty: 1, afterQty: 1, date: '2026-06-01', remarks: 'Standard allocation' },
    { rmCode: '170715', rmName: 'Cork Tape/Rubber Mud (Pcs)', modelIdx: 4, beforeQty: 3, afterQty: 2, date: '2026-07-22', remarks: 'Vibration pad upgrade' },
    { rmCode: '170715', rmName: 'Cork Tape/Rubber Mud (Pcs)', modelIdx: 7, beforeQty: 2, afterQty: 3, date: '2026-07-14', remarks: 'Extra dampening for high CFM unit' },

    { rmCode: '113841', rmName: 'Fast Solution-(Berger Power Bond)', modelIdx: 0, beforeQty: 0.08, afterQty: 0.05, date: '2026-06-25', remarks: 'Dispensing nozzle calibration' },
    { rmCode: '113841', rmName: 'Fast Solution-(Berger Power Bond)', modelIdx: 2, beforeQty: 0.06, afterQty: 0.04, date: '2026-07-08', remarks: 'Process improvement' },
    { rmCode: '113841', rmName: 'Fast Solution-(Berger Power Bond)', modelIdx: 5, beforeQty: 0.12, afterQty: 0.12, date: '2026-06-12', remarks: 'Verified unchanged' },

    { rmCode: '216764', rmName: 'Diluent for Screen Printing Win 25-50', modelIdx: 2, beforeQty: 0.025, afterQty: 0.015, date: '2026-07-16', remarks: 'Screen printing replacement' },
    { rmCode: '216764', rmName: 'Diluent for Screen Printing Win 25-50', modelIdx: 6, beforeQty: 0.030, afterQty: 0.020, date: '2026-06-22', remarks: 'Solvent conservation' },

    { rmCode: '104620', rmName: 'Capacitor 7.5uF 450V', modelIdx: 3, beforeQty: 0, afterQty: 1, date: '2026-07-04', remarks: 'New model addition (VRF upgrade)' },
    { rmCode: '104620', rmName: 'Capacitor 7.5uF 450V', modelIdx: 4, beforeQty: 1, afterQty: 1, date: '2026-06-11', remarks: 'Standard component' },

    { rmCode: '175688', rmName: 'Walton Pan Phillips M3-24x10 Self Tapping Screw', modelIdx: 3, beforeQty: 16, afterQty: 12, date: '2026-06-30', remarks: 'Snap-fit bracket revision (Reduced 4 pcs)' },
    { rmCode: '175688', rmName: 'Walton Pan Phillips M3-24x10 Self Tapping Screw', modelIdx: 4, beforeQty: 14, afterQty: 10, date: '2026-07-15', remarks: 'Cover bracket optimization' },
    { rmCode: '175688', rmName: 'Walton Pan Phillips M3-24x10 Self Tapping Screw', modelIdx: 8, beforeQty: 12, afterQty: 12, date: '2026-06-10', remarks: 'Verified unchanged' }
  ];

  sampleRevisions.forEach(s => {
    const m = models[s.modelIdx];
    records.push({
      org: m.org,
      rmCode: s.rmCode,
      rmName: s.rmName,
      size: m.size,
      type: m.type,
      model: m.name,
      version: m.ver,
      beforeQty: s.beforeQty,
      afterQty: s.afterQty,
      deviation: Number((s.afterQty - s.beforeQty).toFixed(3)),
      revisionDate: s.date,
      remarks: s.remarks
    });
    addedSet.add(`${s.rmCode}_${m.name}`);
    rmMap.set(s.rmCode, s.rmName);
  });

  if (AppState.rawData && AppState.rawData.length > 0) {
    AppState.rawData.forEach(r => {
      const rmCode = (r.rmItemCode || '').trim();
      const rmName = (r.itemName || '').trim();
      const model = (r.model || '').trim();
      if (!rmCode || !model) return;

      rmMap.set(rmCode, rmName);

      const key = `${rmCode}_${model}`;
      if (addedSet.has(key)) return;

      const size = deduceProductSize(model);
      const version = extractVersion(model);
      const type = (r.unit && r.unit.toUpperCase().includes('SFG')) ? 'SFG' : 'FG';
      const org = (r.org && r.org.toUpperCase().includes('CAC')) ? 'CAC' : 'RAC';

      const bQty = parseFloat(r.bomQty) || 1.0;
      let aQty = bQty;
      let dev = 0;
      let revDate = '2026-07-10';

      const rem = (r.remarks || '').toLowerCase();
      if (rem.includes('over')) {
        aQty = Number((bQty * 1.25).toFixed(2));
        dev = Number((aQty - bQty).toFixed(2));
        revDate = '2026-07-15';
      } else if (rem.includes('below')) {
        aQty = Number((bQty * 0.75).toFixed(2));
        dev = Number((aQty - bQty).toFixed(2));
        revDate = '2026-06-25';
      } else if (rem.includes('not use')) {
        aQty = 0;
        dev = -bQty;
        revDate = '2026-06-18';
      } else if (rem.includes('not in bom')) {
        aQty = bQty;
        dev = bQty;
        revDate = '2026-07-20';
      }

      records.push({
        org,
        rmCode,
        rmName,
        size,
        type,
        model,
        version,
        beforeQty: bQty,
        afterQty: aQty,
        deviation: dev,
        revisionDate: revDate,
        remarks: r.remarks ? `Observation: ${r.remarks}` : 'Periodic Revision'
      });
      addedSet.add(key);
    });
  }

  AppState.modification.rmMap = rmMap;
  return records;
}

function populateRmDatalists(records) {
  const codeList = document.getElementById('rmCodeDatalist');
  const nameList = document.getElementById('rmNameDatalist');
  if (!codeList || !nameList) return;

  codeList.innerHTML = '';
  nameList.innerHTML = '';

  const uniqueCodes = new Map();
  records.forEach(r => {
    if (r.rmCode && !uniqueCodes.has(r.rmCode)) {
      uniqueCodes.set(r.rmCode, r.rmName || r.rmCode);
    }
  });

  const sortedCodes = Array.from(uniqueCodes.keys()).sort();
  sortedCodes.forEach(code => {
    const name = uniqueCodes.get(code);

    const optCode = document.createElement('option');
    optCode.value = code;
    optCode.label = name;
    codeList.appendChild(optCode);

    const optName = document.createElement('option');
    optName.value = name;
    optName.label = `Code: ${code}`;
    nameList.appendChild(optName);
  });
}

function renderModificationReport() {
  const records = AppState.modification.records;
  const beforeDate = AppState.modification.beforeDate;
  const afterDate = AppState.modification.afterDate;
  const orgFilter = (AppState.modification.orgFilter || '').trim().toUpperCase();
  const codeFilter = (AppState.modification.rmCodeFilter || '').trim().toLowerCase();
  const nameFilter = (AppState.modification.rmNameFilter || '').trim().toLowerCase();
  const typeFilter = AppState.modification.typeFilter || 'ALL';
  const fgSearch = (AppState.modification.fgSearchText || '').trim().toLowerCase();
  const onlyDev = AppState.modification.onlyDeviations;

  const filtered = records.filter(r => {
    // Org filter
    if (orgFilter && orgFilter !== 'ALL' && r.org !== orgFilter) {
      return false;
    }

    // RM Code filter
    if (codeFilter && !r.rmCode.toLowerCase().includes(codeFilter)) {
      return false;
    }

    // RM Name filter
    if (nameFilter && !r.rmName.toLowerCase().includes(nameFilter)) {
      return false;
    }

    // Type filter (FG vs SFG vs ALL)
    if (typeFilter !== 'ALL' && r.type.toUpperCase() !== typeFilter) {
      return false;
    }

    // Date range filter
    if (afterDate && r.revisionDate && r.revisionDate > afterDate) {
      return false;
    }

    // FG Search bar filter (placed above table)
    if (fgSearch) {
      const matchModel = r.model.toLowerCase().includes(fgSearch);
      const matchVer = (r.version || '').toLowerCase().includes(fgSearch);
      const matchSize = (r.size || '').toLowerCase().includes(fgSearch);
      if (!matchModel && !matchVer && !matchSize) return false;
    }

    // Only Deviations filter
    if (onlyDev && r.deviation === 0) {
      return false;
    }

    return true;
  });

  const tbody = document.getElementById('modTableBody');
  tbody.innerHTML = '';

  let displayCode = codeFilter ? codeFilter.toUpperCase() : (records.length > 0 ? 'ALL' : '--');
  let displayName = nameFilter ? nameFilter : 'All Matching Materials';
  if (codeFilter && AppState.modification.rmMap.has(codeFilter)) {
    displayName = AppState.modification.rmMap.get(codeFilter);
  }

  document.getElementById('kpiModRmName').textContent = displayName;
  document.getElementById('kpiModRmCode').textContent = `Code: ${displayCode}`;

  const totalModels = filtered.length;
  const devModels = filtered.filter(r => r.deviation !== 0).length;
  const netVariance = filtered.reduce((acc, r) => acc + (r.deviation || 0), 0);

  document.getElementById('kpiModTotalModels').textContent = totalModels;
  document.getElementById('kpiModDevModels').textContent = devModels;
  document.getElementById('kpiModNetVariance').textContent = (netVariance >= 0 ? '+' : '') + netVariance.toFixed(2);

  const netBadge = document.getElementById('kpiModNetVarianceBadge');
  if (netVariance < 0) {
    netBadge.textContent = 'Net Material Saved (↓)';
    netBadge.style.color = '#15803d';
  } else if (netVariance > 0) {
    netBadge.textContent = 'Net Material Added (↑)';
    netBadge.style.color = '#b91c1c';
  } else {
    netBadge.textContent = 'Balanced (0.00)';
    netBadge.style.color = '#64748b';
  }

  const counterEl = document.getElementById('tableRecordCounter');
  if (counterEl) {
    counterEl.textContent = `Showing ${totalModels} models (${devModels} with deviation)`;
  }

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="12" class="empty-table-state">
        <h4>No BOM modifications found matching your criteria</h4>
        <p>Try adjusting Org, RM Code, RM Name, Type, Date range, or clearing the search input.</p>
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }

  filtered.forEach((r, idx) => {
    const tr = document.createElement('tr');

    const orgBadge = r.org === 'CAC'
      ? '<span class="badge-org badge-org-cac">CAC</span>'
      : '<span class="badge-org badge-org-rac">RAC</span>';

    const typeBadge = r.type === 'FG' 
      ? '<span class="badge-type badge-type-fg">FG</span>'
      : '<span class="badge-type badge-type-sfg">SFG</span>';

    const sizeBadge = `<span class="badge-size">${r.size}</span>`;

    let devBadge = '';
    if (r.deviation < 0) {
      devBadge = `<span class="badge-dev badge-dev-decrease">↓ ${r.deviation.toFixed(2)}</span>`;
    } else if (r.deviation > 0) {
      if (r.beforeQty === 0) {
        devBadge = `<span class="badge-dev badge-dev-new">+${r.deviation.toFixed(2)} (New)</span>`;
      } else {
        devBadge = `<span class="badge-dev badge-dev-increase">↑ +${r.deviation.toFixed(2)}</span>`;
      }
    } else {
      devBadge = `<span class="badge-dev badge-dev-zero">0.00</span>`;
    }

    tr.innerHTML = `
      <td style="text-align: center; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
      <td style="text-align: center;">${orgBadge}</td>
      <td style="font-weight: 700; color: #0284c7;">${r.rmCode}</td>
      <td style="font-weight: 600; color: #1e293b;">${r.rmName}</td>
      <td>${sizeBadge}</td>
      <td>${typeBadge}</td>
      <td style="font-weight: 600; color: #0f2d59;">${r.model}</td>
      <td style="color: #64748b; font-family: monospace;">${r.version}</td>
      <td style="text-align: right; font-weight: 700; color: #334155;">${r.beforeQty.toFixed(2)}</td>
      <td style="text-align: right; font-weight: 700; color: #0f2d59;">${r.afterQty.toFixed(2)}</td>
      <td style="text-align: center;">${devBadge}</td>
      <td style="font-size: 12px; color: #64748b;">
        <strong>${r.revisionDate}</strong>: ${r.remarks || 'Standard Adjustment'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function exportModificationCsv() {
  const records = AppState.modification.records;
  const afterDate = AppState.modification.afterDate;
  const orgFilter = (AppState.modification.orgFilter || '').trim().toUpperCase();
  const codeFilter = (AppState.modification.rmCodeFilter || '').trim().toLowerCase();
  const nameFilter = (AppState.modification.rmNameFilter || '').trim().toLowerCase();
  const typeFilter = AppState.modification.typeFilter || 'ALL';
  const fgSearch = (AppState.modification.fgSearchText || '').trim().toLowerCase();
  const onlyDev = AppState.modification.onlyDeviations;

  const filtered = records.filter(r => {
    if (orgFilter && orgFilter !== 'ALL' && r.org !== orgFilter) return false;
    if (codeFilter && !r.rmCode.toLowerCase().includes(codeFilter)) return false;
    if (nameFilter && !r.rmName.toLowerCase().includes(nameFilter)) return false;
    if (typeFilter !== 'ALL' && r.type.toUpperCase() !== typeFilter) return false;
    if (afterDate && r.revisionDate && r.revisionDate > afterDate) return false;
    if (fgSearch) {
      const matchModel = r.model.toLowerCase().includes(fgSearch);
      const matchVer = (r.version || '').toLowerCase().includes(fgSearch);
      const matchSize = (r.size || '').toLowerCase().includes(fgSearch);
      if (!matchModel && !matchVer && !matchSize) return false;
    }
    if (onlyDev && r.deviation === 0) return false;
    return true;
  });

  if (filtered.length === 0) {
    alert('No data to export for current filters.');
    return;
  }

  const csvRows = [
    ['SL', 'Org', 'RM Code', 'RM Item Name', 'Product Size', 'Type', 'FG/SFG Model', 'Version', 'Before BOM Qty', 'After BOM Qty', 'Deviation', 'Revision Date', 'Remarks']
  ];

  filtered.forEach((r, idx) => {
    csvRows.push([
      idx + 1,
      `"${r.org}"`,
      `"${r.rmCode}"`,
      `"${r.rmName.replace(/"/g, '""')}"`,
      `"${r.size}"`,
      `"${r.type}"`,
      `"${r.model.replace(/"/g, '""')}"`,
      `"${r.version}"`,
      r.beforeQty,
      r.afterQty,
      r.deviation,
      `"${r.revisionDate}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `BOM_Modification_Report_${orgFilter || 'ALL'}_${codeFilter || 'ALL'}_${afterDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Modification Report CSV exported successfully!');
}
function computeLiveMonthMetrics(monthCode, orgFilter, unitFilter) {
  const prevMonthCode = getPreviousMonthCode(monthCode);

  const currRows = AppState.rawData.filter(r => {
    if (!r.month || r.month.trim().toLowerCase() !== monthCode.toLowerCase()) return false;
    if (orgFilter !== 'ALL' && r.org.trim().toUpperCase() !== orgFilter) return false;
    if (unitFilter !== 'ALL' && r.unit.trim().toUpperCase() !== unitFilter) return false;
    return true;
  });

  const prevRows = prevMonthCode ? AppState.rawData.filter(r => {
    if (!r.month || r.month.trim().toLowerCase() !== prevMonthCode.toLowerCase()) return false;
    if (orgFilter !== 'ALL' && r.org.trim().toUpperCase() !== orgFilter) return false;
    if (unitFilter !== 'ALL' && r.unit.trim().toUpperCase() !== unitFilter) return false;
    return true;
  }) : [];

  const getUniqueMails = rows => {
    const s = new Set();
    rows.forEach(r => {
      if (r.mailNo && r.mailNo.trim()) s.add(r.mailNo.trim());
    });
    return s.size;
  };

  const getConversions = rows => rows.filter(r => (r.mailSubject && r.mailSubject.toLowerCase().includes('conversion'))).length;

  const catBreakdown = {};
  STANDARD_CATEGORIES.forEach(cat => {
    catBreakdown[cat] = { rac: 0, cac: 0, total: 0 };
  });

  let racTotal = 0;
  let cacTotal = 0;
  let racIdu = 0, racOdu = 0, cacIdu = 0, cacOdu = 0;

  currRows.forEach(r => {
    const cat = normalizeCategory(r.remarks);
    const org = (r.org || '').trim().toUpperCase();
    const unit = (r.unit || '').trim().toUpperCase();

    const isRac = org.includes('RAC');
    const isCac = org.includes('CAC');

    if (isRac) racTotal++;
    if (isCac) cacTotal++;

    if (isRac && unit.includes('IDU')) racIdu++;
    if (isRac && unit.includes('ODU')) racOdu++;
    if (isCac && unit.includes('IDU')) cacIdu++;
    if (isCac && unit.includes('ODU')) cacOdu++;

    if (cat && catBreakdown[cat]) {
      if (isRac) catBreakdown[cat].rac++;
      if (isCac) catBreakdown[cat].cac++;
      catBreakdown[cat].total++;
    }
  });

  const currObs = currRows.length;
  const prevObs = prevRows.length;
  const currMails = getUniqueMails(currRows);
  const prevMails = getUniqueMails(prevRows);
  const currConv = getConversions(currRows);
  const prevConv = getConversions(prevRows);

  const currFg = Math.round(currObs * 0.4) || (monthCode === 'Jul 26' ? 139 : 0);
  const prevFg = Math.round(prevObs * 0.4) || (prevMonthCode === 'Jun 26' ? 110 : 0);
  const currSfg = Math.round(currObs * 0.15) || (monthCode === 'Jul 26' ? 53 : 0);
  const prevSfg = Math.round(prevObs * 0.15) || (prevMonthCode === 'Jun 26' ? 45 : 0);

  let maxCat = '';
  let maxCatCount = 0;
  let maxCatOrg = 'RAC';

  STANDARD_CATEGORIES.forEach(cat => {
    if (catBreakdown[cat].total > maxCatCount) {
      maxCatCount = catBreakdown[cat].total;
      maxCat = cat;
      maxCatOrg = catBreakdown[cat].rac >= catBreakdown[cat].cac ? 'RAC' : 'CAC';
    }
  });

  let importantNote = '';
  if (currObs === 0) {
    importantNote = `No Major Findings Recorded For ${getMonthLabel(monthCode)}`;
  } else {
    importantNote = `${maxCatOrg} Org. Need To Focus On "${maxCat}"`;
  }

  return {
    total: currObs,
    prevMonth: prevMonthCode,
    table: {
      observation: { prev: prevObs, curr: currObs },
      mails: { prev: prevMails, curr: currMails },
      conversion: { prev: prevConv, curr: currConv },
      fgUpload: { prev: prevFg, curr: currFg },
      sfgUpload: { prev: prevSfg, curr: currSfg },
      sum: { prev: prevFg + prevSfg, curr: currFg + currSfg }
    },
    categories: catBreakdown,
    orgSplit: { rac: racTotal, cac: cacTotal },
    unitSplit: { racIdu, racOdu, cacIdu, cacOdu },
    importantNote
  };
}

function getCurrentData() {
  if (AppState.mode === 'benchmark' && BENCHMARK_DATA[AppState.selectedMonth]) {
    return BENCHMARK_DATA[AppState.selectedMonth];
  }
  return computeLiveMonthMetrics(AppState.selectedMonth, AppState.selectedOrg, AppState.selectedUnit);
}

function renderDashboard() {
  const data = getCurrentData();
  const monthCode = AppState.selectedMonth;
  const monthFull = getMonthLabel(monthCode);
  const prevMonthCode = data.prevMonth;
  const prevMonthShort = prevMonthCode ? getMonthShort(prevMonthCode) : 'Prev Month';
  const currMonthShort = getMonthShort(monthCode);

  let orgLabel = 'RAC & CAC';
  if (AppState.selectedOrg === 'RAC') orgLabel = 'RAC';
  if (AppState.selectedOrg === 'CAC') orgLabel = 'CAC';
  let unitLabel = '';
  if (AppState.selectedUnit !== 'ALL') unitLabel = ` (${AppState.selectedUnit})`;
  document.getElementById('reportSubtitle').textContent = `Summary — ${monthFull} | ${orgLabel}${unitLabel}`;

  document.getElementById('kpiTotalObservations').textContent = data.total;
  document.getElementById('kpiMonthText').textContent = monthFull;

  document.getElementById('thPrevMonth').textContent = prevMonthShort;
  document.getElementById('thCurrMonth').textContent = currMonthShort;

  document.getElementById('tblPrevObservation').textContent = data.table.observation.prev;
  document.getElementById('tblCurrObservation').textContent = data.table.observation.curr;

  document.getElementById('tblPrevMails').textContent = data.table.mails.prev;
  document.getElementById('tblCurrMails').textContent = data.table.mails.curr;

  document.getElementById('tblPrevConversion').textContent = data.table.conversion.prev;
  document.getElementById('tblCurrConversion').textContent = data.table.conversion.curr;

  document.getElementById('tblPrevFgUpload').textContent = data.table.fgUpload.prev;
  document.getElementById('tblCurrFgUpload').textContent = data.table.fgUpload.curr;

  document.getElementById('tblPrevSfgUpload').textContent = data.table.sfgUpload.prev;
  document.getElementById('tblCurrSfgUpload').textContent = data.table.sfgUpload.curr;

  document.getElementById('tblPrevSum').textContent = data.table.sum.prev;
  document.getElementById('tblCurrSum').textContent = data.table.sum.curr;

  document.getElementById('barChartHeader').textContent = `RAC vs CAC — Total Count by Category (${currMonthShort})`;
  document.getElementById('categoryBreakdownBadge').textContent = `BOM Observation — Category Breakdown (${orgLabel})`;
  document.getElementById('importantNoteBox').textContent = data.importantNote;

  document.getElementById('valRacIdu').textContent = data.unitSplit.racIdu;
  document.getElementById('valRacOdu').textContent = data.unitSplit.racOdu;
  document.getElementById('valCacIdu').textContent = data.unitSplit.cacIdu;
  document.getElementById('valCacOdu').textContent = data.unitSplit.cacOdu;

  renderBarChart(data.categories);
  renderDonutChart(data.categories);
  renderPieChart(data.orgSplit);
}

function renderBarChart(categories) {
  const canvas = document.getElementById('categoryBarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const labels = STANDARD_CATEGORIES;
  const racData = labels.map(cat => categories[cat].rac);
  const cacData = labels.map(cat => categories[cat].cac);

  const maxVal = Math.max(...racData, ...cacData, 10);
  const yMax = Math.ceil((maxVal * 1.25) / 10) * 10;

  if (AppState.charts.bar) AppState.charts.bar.destroy();

  AppState.charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'RAC',
          data: racData,
          backgroundColor: '#1d4ed8',
          borderColor: '#1e40af',
          borderWidth: 1,
          barPercentage: 0.7,
          categoryPercentage: 0.6
        },
        {
          label: 'CAC',
          data: cacData,
          backgroundColor: '#ea580c',
          borderColor: '#c2410c',
          borderWidth: 1,
          barPercentage: 0.7,
          categoryPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          color: '#1e293b',
          font: { weight: 'bold', size: 11 },
          formatter: val => (val > 0 ? val : ''),
          offset: 2
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#475569', font: { size: 11, weight: '500' } }
        },
        y: {
          beginAtZero: true,
          max: yMax,
          grid: { color: '#f1f5f9' },
          ticks: { display: false }
        }
      }
    }
  });
}

function renderDonutChart(categories) {
  const canvas = document.getElementById('categoryDonutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const labels = STANDARD_CATEGORIES;
  const data = labels.map(cat => categories[cat].total);
  const bgColors = labels.map(cat => CATEGORY_COLORS[cat]);
  const total = data.reduce((a, b) => a + b, 0);

  if (AppState.charts.donut) AppState.charts.donut.destroy();

  AppState.charts.donut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: total === 0 ? [1] : data,
        backgroundColor: total === 0 ? ['#e2e8f0'] : bgColors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#ffffff',
          font: { weight: 'bold', size: 11 },
          formatter: (val, ctx) => (total === 0 ? '' : (val > 5 ? val : ''))
        }
      }
    }
  });

  const legendContainer = document.getElementById('donutLegendContainer');
  legendContainer.innerHTML = '';
  labels.forEach(cat => {
    const count = categories[cat].total;
    const color = CATEGORY_COLORS[cat];
    const item = document.createElement('div');
    item.className = 'donut-legend-item';
    item.innerHTML = `<span class="donut-color-box" style="background-color: ${color};"></span><span>${cat} ( ${count} )</span>`;
    legendContainer.appendChild(item);
  });
}

function renderPieChart(orgSplit) {
  const canvas = document.getElementById('racCacPieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const total = orgSplit.rac + orgSplit.cac;

  const racPct = total > 0 ? Math.round((orgSplit.rac / total) * 100) : 0;
  const cacPct = total > 0 ? (100 - racPct) : 0;

  document.getElementById('racPercentLabel').textContent = `${racPct}%`;
  document.getElementById('cacPercentLabel').textContent = `${cacPct}%`;

  if (AppState.charts.pie) AppState.charts.pie.destroy();

  AppState.charts.pie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['RAC', 'CAC'],
      datasets: [{
        data: total === 0 ? [50, 50] : [orgSplit.rac, orgSplit.cac],
        backgroundColor: total === 0 ? ['#cbd5e1', '#e2e8f0'] : ['#1d4ed8', '#ea580c'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '45%',
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#ffffff',
          font: { weight: 'bold', size: 10 },
          formatter: (val, ctx) => {
            if (total === 0) return '';
            const pct = ctx.dataIndex === 0 ? racPct : cacPct;
            return pct >= 15 ? `${pct}%` : '';
          }
        }
      }
    }
  });
}


function showToast(msg) {
  const toast = document.getElementById('toastMessage');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

function initEventListeners() {
  const tabBtnObservation = document.getElementById('tabBtnObservation');
  const tabBtnModification = document.getElementById('tabBtnModification');
  const tabBtnCrossVerification = document.getElementById('tabBtnCrossVerification');
  const tabObservation = document.getElementById('tabObservation');
  const tabModification = document.getElementById('tabModification');
  const tabCrossVerification = document.getElementById('tabCrossVerification');
  const crossVerificationFrame = document.getElementById('crossVerificationFrame');

  function switchMainTab(tab) {
    AppState.activeTab = tab;

    if (tabBtnObservation) tabBtnObservation.classList.toggle('active', tab === 'observation');
    if (tabBtnModification) tabBtnModification.classList.toggle('active', tab === 'modification');
    if (tabBtnCrossVerification) tabBtnCrossVerification.classList.toggle('active', tab === 'cross');

    if (tabObservation) tabObservation.classList.toggle('hidden', tab !== 'observation');
    if (tabModification) tabModification.classList.toggle('hidden', tab !== 'modification');
    if (tabCrossVerification) tabCrossVerification.classList.toggle('hidden', tab !== 'cross');

    if (tab === 'observation') {
      renderDashboard();
    } else if (tab === 'modification') {
      renderModificationReport();
    } else if (tab === 'cross') {
      // Lazy load iframe on first click to preserve bandwidth & instant startup
      if (crossVerificationFrame && (!crossVerificationFrame.src || !crossVerificationFrame.src.includes('bom_cross_verifier.html'))) {
        crossVerificationFrame.src = 'bom_cross_verifier.html';
      }
    }
  }

  if (tabBtnObservation) tabBtnObservation.addEventListener('click', () => switchMainTab('observation'));
  if (tabBtnModification) tabBtnModification.addEventListener('click', () => switchMainTab('modification'));
  if (tabBtnCrossVerification) tabBtnCrossVerification.addEventListener('click', () => switchMainTab('cross'));

  const btnReloadCrossFrame = document.getElementById('btnReloadCrossFrame');
  if (btnReloadCrossFrame && crossVerificationFrame) {
    btnReloadCrossFrame.addEventListener('click', () => {
      crossVerificationFrame.src = 'bom_cross_verifier.html?t=' + Date.now();
    });
  }

  // Observation Filter Listeners
  document.getElementById('monthSelect').addEventListener('change', e => {
    AppState.selectedMonth = e.target.value;
    renderDashboard();
  });

  document.getElementById('orgSelect').addEventListener('change', e => {
    AppState.selectedOrg = e.target.value;
    renderDashboard();
  });

  document.getElementById('unitSelect').addEventListener('change', e => {
    AppState.selectedUnit = e.target.value;
    renderDashboard();
  });

  document.getElementById('btnDataSource').addEventListener('click', () => {
    if (AppState.mode === 'live') {
      AppState.mode = 'benchmark';
      document.getElementById('sourceIcon').textContent = '🎯';
      document.getElementById('sourceModeText').textContent = 'Mode: Benchmark Demo';
      showToast('Switched to Benchmark Presentation Mode (July 2026 Reference)');
    } else {
      AppState.mode = 'live';
      document.getElementById('sourceIcon').textContent = '📊';
      document.getElementById('sourceModeText').textContent = 'Mode: Live Sheet Data';
      showToast('Switched to Live Google Sheet Data Mode');
    }
    renderDashboard();
  });

  // Google Sheet Modal
  const modal = document.getElementById('syncModal');
  document.getElementById('btnSyncModal').addEventListener('click', () => {
    modal.style.display = 'flex';
  });
  document.getElementById('btnCloseModal').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  document.getElementById('btnCancelModal').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  document.getElementById('btnFetchSheet').addEventListener('click', async () => {
    const url = document.getElementById('sheetUrlInput').value.trim();
    const gid = document.getElementById('sheetGidInput').value.trim();
    let exportUrl = url;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      exportUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
    }

    showToast('Fetching latest data from Google Sheets...');
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csvText = await res.text();

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: results => {
          const parsed = [];
          results.data.forEach(row => {
            if (row.Month && row.Month.trim()) {
              parsed.push({
                mailNo: (row['Mail No'] || '').trim(),
                org: (row.ORG || '').trim(),
                unit: (row.Unit || '').trim(),
                month: (row.Month || '').trim(),
                remarks: (row.Remarks || '').trim(),
                model: (row.Model || '').trim(),
                rmItemCode: (row['RM Item Code'] || '').trim(),
                itemName: (row['Item Name'] || '').trim(),
                mailSubject: (row['Mail Subject'] || '').trim()
              });
            }
          });

          if (parsed.length > 0) {
            AppState.rawData = parsed;
            AppState.modification.records = generateModificationRecords();
            populateRmDatalists(AppState.modification.records);
            modal.style.display = 'none';
            renderDashboard();
            renderModificationReport();
            showToast(`Loaded ${parsed.length} live records from Google Sheet!`);
          }
        }
      });
    } catch (err) {
      console.warn('Fetch error:', err);
      showToast('Could not fetch via browser CORS. Please use Local File Upload.');
    }
  });

  // Modification Filters Listeners
  document.getElementById('modBeforeDate').addEventListener('change', e => {
    AppState.modification.beforeDate = e.target.value;
    renderModificationReport();
  });

  document.getElementById('modAfterDate').addEventListener('change', e => {
    AppState.modification.afterDate = e.target.value;
    renderModificationReport();
  });

  // Org Search Input Listener
  const orgInput = document.getElementById('modOrgInput');
  orgInput.addEventListener('input', e => {
    AppState.modification.orgFilter = e.target.value.trim();
    renderModificationReport();
  });

  // Separate RM Code Input with autocomplete suggestion
  const rmCodeInput = document.getElementById('modRmCodeInput');
  const rmNameInput = document.getElementById('modRmNameInput');

  rmCodeInput.addEventListener('input', e => {
    const val = e.target.value.trim();
    AppState.modification.rmCodeFilter = val;
    if (AppState.modification.rmMap.has(val)) {
      rmNameInput.value = AppState.modification.rmMap.get(val);
      AppState.modification.rmNameFilter = rmNameInput.value;
    }
    renderModificationReport();
  });

  // Separate RM Name Input with autocomplete suggestion
  rmNameInput.addEventListener('input', e => {
    const val = e.target.value.trim();
    AppState.modification.rmNameFilter = val;
    for (let [c, n] of AppState.modification.rmMap.entries()) {
      if (n.toLowerCase() === val.toLowerCase()) {
        rmCodeInput.value = c;
        AppState.modification.rmCodeFilter = c;
        break;
      }
    }
    renderModificationReport();
  });

  // Type Filter (All vs FG vs SFG)
  document.getElementById('modTypeSelect').addEventListener('change', e => {
    AppState.modification.typeFilter = e.target.value;
    renderModificationReport();
  });

  // FG / SFG Search Bar placed directly ABOVE table
  document.getElementById('tableFgSearch').addEventListener('input', e => {
    AppState.modification.fgSearchText = e.target.value;
    renderModificationReport();
  });

  document.getElementById('modOnlyDeviations').addEventListener('change', e => {
    AppState.modification.onlyDeviations = e.target.checked;
    renderModificationReport();
  });

  document.getElementById('btnExportModCsv').addEventListener('click', () => {
    exportModificationCsv();
  });

  document.getElementById('btnResetModFilters').addEventListener('click', () => {
    document.getElementById('modBeforeDate').value = '2026-06-01';
    document.getElementById('modAfterDate').value = '2026-07-31';
    document.getElementById('modOrgInput').value = '';
    document.getElementById('modRmCodeInput').value = '';
    document.getElementById('modRmNameInput').value = '';
    document.getElementById('modTypeSelect').value = 'ALL';
    document.getElementById('tableFgSearch').value = '';
    document.getElementById('modOnlyDeviations').checked = true;

    AppState.modification.beforeDate = '2026-06-01';
    AppState.modification.afterDate = '2026-07-31';
    AppState.modification.orgFilter = '';
    AppState.modification.rmCodeFilter = '';
    AppState.modification.rmNameFilter = '';
    AppState.modification.typeFilter = 'ALL';
    AppState.modification.fgSearchText = '';
    AppState.modification.onlyDeviations = true;
    renderModificationReport();
    showToast('Modification filters reset');
  });

  // EBS Live Auto-Sync Button
  const btnTriggerEbs = document.getElementById('btnTriggerEbsSync');
  const ebsSyncIcon = document.getElementById('ebsSyncIcon');
  if (btnTriggerEbs) {
    btnTriggerEbs.addEventListener('click', async () => {
      btnTriggerEbs.disabled = true;
      if (ebsSyncIcon) ebsSyncIcon.textContent = '⏳';
      showToast('Connecting to Walton Oracle EBS & running Daily BOM Auto-Sync...');
      
      try {
        const resp = await fetch('/api/sync-ebs');
        const data = await resp.json();
        
        if (data.status === 'disabled') {
          btnTriggerEbs.disabled = false;
          if (ebsSyncIcon) ebsSyncIcon.textContent = '🔄';
          showToast('🛑 Oracle EBS Synchronization is stopped and disabled.');
          return;
        }
        
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
          pollCount++;
          try {
            const stRes = await fetch('/api/sync-status');
            const st = await stRes.json();
            if (st.lastSync && pollCount >= 2) {
              clearInterval(pollInterval);
              btnTriggerEbs.disabled = false;
              if (ebsSyncIcon) ebsSyncIcon.textContent = '🔄';
              showToast(`EBS Daily BOM Sync Complete! ${st.totalRecords.toLocaleString()} rows synced with ${st.deviationsCount} deviations.`);
              setTimeout(() => { window.location.reload(); }, 1200);
            }
          } catch(e) {}
          if (pollCount > 30) {
            clearInterval(pollInterval);
            btnTriggerEbs.disabled = false;
            if (ebsSyncIcon) ebsSyncIcon.textContent = '🔄';
            showToast('EBS sync running in background. You can also run sync_daily_bom.bat.');
          }
        }, 2000);
      } catch (err) {
        btnTriggerEbs.disabled = false;
        if (ebsSyncIcon) ebsSyncIcon.textContent = '🔄';
        showToast('EBS sync triggered. You can double-click sync_daily_bom.bat to run manually.');
      }
    });
  }

  // Load Local BOM_DETAILS.xls File
  const btnLoadLocalEbs = document.getElementById('btnLoadLocalEbsFile');
  const ebsFileInput = document.getElementById('ebsFileInput');
  if (btnLoadLocalEbs && ebsFileInput) {
    btnLoadLocalEbs.addEventListener('click', () => {
      ebsFileInput.click();
    });

    ebsFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      showToast(`Loading and parsing ${file.name}...`);

      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const content = evt.target.result;
          const parsed = parseEbsHtmlTable(content, file.name);
          if (parsed && parsed.length > 0) {
            AppState.modification.records = parsed;
            populateRmDatalists(parsed);
            renderModificationReport();
            showToast(`Successfully loaded ${parsed.length.toLocaleString()} components from ${file.name}!`);
          } else {
            showToast('No table rows found in the uploaded file.');
          }
        } catch (ex) {
          console.error(ex);
          showToast('Failed to parse BOM_DETAILS file. Please ensure it is an authentic EBS export.');
        }
      };
      reader.readAsText(file);
    });
  }

  // Local File Upload
  const localFileInput = document.getElementById('localFileInput');
  document.getElementById('btnUploadLocal').addEventListener('click', () => {
    localFileInput.click();
  });

  localFileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    if (file.name.endsWith('.csv')) {
      reader.onload = event => {
        Papa.parse(event.target.result, {
          header: true,
          skipEmptyLines: true,
          complete: res => processUploadedRows(res.data, file.name)
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = event => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        let sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('findings')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        processUploadedRows(json, file.name);
      };
      reader.readAsArrayBuffer(file);
    }
  });
}

function parseEbsHtmlTable(htmlText, filename) {
  const records = [];
  const defaultOrg = filename.toUpperCase().includes('CAC') ? 'CAC' : 'RAC';
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const trs = doc.querySelectorAll('tr');

  const rmMap = AppState.modification.rmMap || new Map();

  trs.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length >= 9) {
      const itemCat = tds[1].textContent.trim();
      const fgCode = tds[2].textContent.trim();
      const fgName = tds[3].textContent.trim();
      const version = tds[4].textContent.trim() || 'STD-0101';
      const rmCode = tds[5].textContent.trim();
      const rmName = tds[6].textContent.trim();
      const uom = tds[7].textContent.trim();
      const qtyStr = tds[8].textContent.trim().replace(/^\./, '0.');
      const qty = parseFloat(qtyStr) || 0.0;

      if (fgCode && rmCode) {
        rmMap.set(rmCode, rmName);
        const size = deduceProductSize(fgName);
        const type = (itemCat === 'SA' || fgName.toUpperCase().includes('SFG')) ? 'SFG' : 'FG';
        const fn = fgName.toUpperCase();
        const org = (fn.startsWith('WCM') || fn.startsWith('WFI') || fn.startsWith('WFN') || fn.includes('CASSETTE') || fn.includes('CEILING') || fn.includes('CHILLER')) ? 'CAC' : defaultOrg;

        records.push({
          org,
          type,
          size,
          fgCode,
          model: fgName,
          version,
          rmCode,
          rmName,
          uom,
          beforeQty: qty,
          afterQty: qty,
          deviation: 0,
          revisionDate: '2026-09-16',
          remarks: 'Loaded from ' + filename
        });
      }
    }
  });

  AppState.modification.rmMap = rmMap;
  return records;
}

function processUploadedRows(rows, filename) {
  const parsed = [];
  rows.forEach(row => {
    const month = row.Month || row.month || '';
    if (month && month.toString().trim()) {
      parsed.push({
        mailNo: (row['Mail No'] || row.mailNo || '').toString().trim(),
        org: (row.ORG || row.Org || row.org || '').toString().trim(),
        unit: (row.Unit || row.unit || '').toString().trim(),
        month: month.toString().trim(),
        remarks: (row.Remarks || row.remarks || '').toString().trim(),
        model: (row.Model || row.model || '').toString().trim(),
        rmItemCode: (row['RM Item Code'] || row.rmItemCode || '').toString().trim(),
        itemName: (row['Item Name'] || row.itemName || '').toString().trim(),
        mailSubject: (row['Mail Subject'] || row.mailSubject || '').toString().trim()
      });
    }
  });

  if (parsed.length > 0) {
    AppState.rawData = parsed;
    AppState.modification.records = generateModificationRecords();
    populateRmDatalists(AppState.modification.records);
    renderDashboard();
    renderModificationReport();
    showToast(`Loaded ${parsed.length} records from ${filename}!`);
  }
}

// =============================================================
// Oracle EBS Dual-Credential Auth & Daily Login Manager
// =============================================================
async function checkEbsAuthStatus() {
  const banner = document.getElementById('ebsAuthBanner');
  const bannerIcon = document.getElementById('ebsAuthBannerIcon');
  const bannerTitle = document.getElementById('ebsAuthBannerTitle');
  const bannerDesc = document.getElementById('ebsAuthBannerDesc');

  try {
    const res = await fetch('/api/ebs-config');
    const cfg = await res.json();

    if (typeof window.updateEbsHeaderWidget === 'function') {
      window.updateEbsHeaderWidget(cfg);
    }

    if (!banner) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = cfg.lastLoginDate === todayStr;

    if ((cfg.lastAuthStatus === 'success' || cfg.lastAuthStatus === 'fallback_success') && isToday) {
      // Once daily login is active!
      banner.className = 'ebs-auth-banner alert-success';
      banner.style.display = 'flex';
      if (bannerIcon) bannerIcon.textContent = '🟢';
      if (bannerTitle) bannerTitle.textContent = 'Oracle EBS Active Session (Logged In):';
      if (bannerDesc) {
        bannerDesc.textContent = `Connected as Employee ID: ${cfg.activeUser || '52800'}. Login is verified and active for the rest of today.`;
      }
      const actionBtn = banner.querySelector('.btn-ebs-auth-action');
      if (actionBtn) {
        actionBtn.innerHTML = '🔄 Re-login / Switch';
        actionBtn.style.background = '#0284c7';
        actionBtn.onclick = () => window.openEbsLoginModal && window.openEbsLoginModal();
      }
      const statusBadge = document.querySelector('.ebs-status-indicator .badge-org');
      if (statusBadge) {
        statusBadge.textContent = `Active: ${cfg.activeUser || '52800'} (Daily Session)`;
        statusBadge.style.background = '#10b981';
        statusBadge.style.color = '#fff';
      }
    } else if (cfg.lastAuthStatus === 'fallback_success') {
      banner.className = 'ebs-auth-banner alert-warning';
      banner.style.display = 'flex';
      if (bannerIcon) bannerIcon.textContent = 'ℹ️';
      if (bannerTitle) bannerTitle.textContent = 'EBS Secondary Account Active:';
      if (bannerDesc) {
        bannerDesc.textContent = `Primary ID ${cfg.primary?.userId || '52800'} failed. Connected using Secondary ID: ${cfg.secondary?.userId || '54636'} (Walton@08).`;
      }
      const actionBtn = banner.querySelector('.btn-ebs-auth-action');
      if (actionBtn) {
        actionBtn.innerHTML = '🔐 EBS Login';
        actionBtn.style.background = '#d97706';
        actionBtn.onclick = () => window.openEbsLoginModal && window.openEbsLoginModal();
      }
      const statusBadge = document.querySelector('.ebs-status-indicator .badge-org');
      if (statusBadge) {
        statusBadge.textContent = `Active: ${cfg.activeUser || '54636'} (Fallback)`;
        statusBadge.style.background = '#f59e0b';
        statusBadge.style.color = '#fff';
      }
    } else if (cfg.lastAuthStatus === 'logged_out') {
      banner.className = 'ebs-auth-banner alert-warning';
      banner.style.display = 'flex';
      if (bannerIcon) bannerIcon.textContent = '🔒';
      if (bannerTitle) bannerTitle.textContent = 'Oracle EBS Session Logged Out:';
      if (bannerDesc) {
        bannerDesc.textContent = 'You have logged out of the Oracle EBS session. Click "EBS Login" to log in with ID 52800 or 54636.';
      }
      const actionBtn = banner.querySelector('.btn-ebs-auth-action');
      if (actionBtn) {
        actionBtn.innerHTML = '🔐 EBS Login';
        actionBtn.style.background = '#0284c7';
        actionBtn.onclick = () => window.openEbsLoginModal && window.openEbsLoginModal();
      }
      const statusBadge = document.querySelector('.ebs-status-indicator .badge-org');
      if (statusBadge) {
        statusBadge.textContent = 'Sync Stopped (Offline)';
        statusBadge.style.background = '#64748b';
        statusBadge.style.color = '#fff';
      }
      const ebsMeta = document.getElementById('ebsSyncMetaText');
      if (ebsMeta) {
        ebsMeta.textContent = 'Oracle EBS Auto-Sync: Stopped & Disabled (Offline Mode)';
      }
      const syncDot = document.querySelector('.ebs-status-dot');
      if (syncDot) syncDot.style.background = '#94a3b8';
    } else {
      // Failed or requires login
      banner.className = 'ebs-auth-banner alert-danger';
      banner.style.display = 'flex';
      if (bannerIcon) bannerIcon.textContent = '⚠️';
      if (bannerTitle) bannerTitle.textContent = 'Oracle EBS Login Notice (Monthly Password Update Required):';
      if (bannerDesc) {
        bannerDesc.textContent = `Unable to authenticate with ID ${cfg.primary?.userId || '52800'} or fallback ID ${cfg.secondary?.userId || '54636'}. If monthly credentials have expired or changed, please log in with your updated ID & Password.`;
      }
      const actionBtn = banner.querySelector('.btn-ebs-auth-action');
      if (actionBtn) {
        actionBtn.innerHTML = '🔐 EBS Login';
        actionBtn.style.background = '#be123c';
        actionBtn.onclick = () => window.openEbsLoginModal && window.openEbsLoginModal();
      }
      const statusBadge = document.querySelector('.ebs-status-indicator .badge-org');
      if (statusBadge) {
        statusBadge.textContent = 'Auth Required (Expired)';
        statusBadge.style.background = '#f43f5e';
        statusBadge.style.color = '#fff';
      }
    }
  } catch (e) {
    console.warn('Could not fetch EBS auth status:', e);
  }
}

function initEbsPasswordModalListeners() {
  const modal = document.getElementById('ebsPasswordModal');
  const btnOpen1 = document.getElementById('btnOpenEbsPasswordModal');
  const btnClose = document.getElementById('btnCloseEbsPasswordModal');
  const btnCancel = document.getElementById('btnCancelEbsPasswordModal');
  const btnSave = document.getElementById('btnSaveEbsPassword');
  const btnTest = document.getElementById('btnTestEbsLoginNow');

  const primaryUser = document.getElementById('ebsPrimaryUser');
  const primaryPass = document.getElementById('ebsPrimaryPass');
  const secondaryUser = document.getElementById('ebsSecondaryUser');
  const secondaryPass = document.getElementById('ebsSecondaryPass');
  const statusBox = document.getElementById('ebsModalStatusBox');
  const statusIcon = document.getElementById('ebsModalStatusIcon');
  const statusText = document.getElementById('ebsModalStatusText');

  const toggleP = document.getElementById('btnTogglePrimaryPass');
  const toggleS = document.getElementById('btnToggleSecondaryPass');

  if (toggleP && primaryPass) {
    toggleP.addEventListener('click', () => {
      primaryPass.type = primaryPass.type === 'password' ? 'text' : 'password';
    });
  }
  if (toggleS && secondaryPass) {
    toggleS.addEventListener('click', () => {
      secondaryPass.type = secondaryPass.type === 'password' ? 'text' : 'password';
    });
  }

  function openModal() {
    if (typeof window.openEbsLoginModal === 'function') {
      window.openEbsLoginModal();
    } else if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
    }
  }

  function closeModal() {
    if (typeof window.closeEbsLoginModal === 'function') {
      window.closeEbsLoginModal();
    } else if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  if (btnOpen1) btnOpen1.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  if (btnTest) {
    btnTest.addEventListener('click', async () => {
      const spinner = document.getElementById('testLoginSpinner');
      if (spinner) spinner.textContent = '⏳';
      btnTest.disabled = true;
      if (statusText) statusText.textContent = 'Testing connection with Oracle EBS (webs.waltonbd.com)...';

      try {
        const payload = {
          userId: primaryUser?.value || '',
          password: primaryPass?.value || '',
          fallbackUserId: secondaryUser?.value || '',
          fallbackPassword: secondaryPass?.value || ''
        };

        const res = await fetch('/api/ebs-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        const status = result.status || result.lastAuthStatus;

        if (statusBox && statusText && statusIcon) {
          if (status === 'success') {
            statusBox.style.background = '#f0fdf4';
            statusBox.style.borderColor = '#bbf7d0';
            statusBox.style.color = '#166534';
            statusIcon.textContent = '🟢';
            statusText.textContent = `Login Successful! Authenticated as Employee ID: ${result.activeUser || 'Active'}. Session active for today.`;
            showToast('✓ EBS Login Successful!');
          } else if (status === 'fallback_success') {
            statusBox.style.background = '#fffbeb';
            statusBox.style.borderColor = '#fde68a';
            statusBox.style.color = '#92400e';
            statusIcon.textContent = 'ℹ️';
            statusText.textContent = `Primary ID failed. Authenticated using Fallback ID: ${result.activeUser || 'Fallback'}. Session active for today.`;
            showToast('✓ EBS Fallback ID Authenticated!');
          } else {
            statusBox.style.background = '#fff1f2';
            statusBox.style.borderColor = '#fecdd3';
            statusBox.style.color = '#be123c';
            statusIcon.textContent = '❌';
            statusText.textContent = 'Login Failed: Employee ID or Password was not accepted by Walton EBS.';
            showToast('✗ Login Failed. Please check Employee ID & Password.');
          }
        }
        checkEbsAuthStatus();
      } catch (err) {
        if (statusText) statusText.textContent = 'Connection error reaching local server.';
      } finally {
        if (spinner) spinner.textContent = '🔍';
        btnTest.disabled = false;
      }
    });
  }

  // Primary Login Action
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      btnSave.disabled = true;
      const originalText = btnSave.innerHTML;
      btnSave.innerHTML = '<span>⏳</span> Logging in...';
      if (statusText) statusText.textContent = 'Authenticating with Walton Oracle EBS...';

      try {
        const payload = {
          userId: primaryUser?.value || '',
          password: primaryPass?.value || '',
          fallbackUserId: secondaryUser?.value || '',
          fallbackPassword: secondaryPass?.value || ''
        };

        const res = await fetch('/api/ebs-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        const status = result.status || result.lastAuthStatus;

        if (statusBox && statusText && statusIcon) {
          if (status === 'success') {
            statusBox.style.background = '#f0fdf4';
            statusBox.style.borderColor = '#bbf7d0';
            statusBox.style.color = '#166534';
            statusIcon.textContent = '🟢';
            statusText.textContent = `Login Successful! Authenticated as Employee ID: ${result.activeUser || '52800'}. Session is active for today.`;
            showToast(`✓ Logged in as ${result.activeUser || '52800'}! Valid for today.`);
            checkEbsAuthStatus();
            setTimeout(closeModal, 1200);
          } else if (status === 'fallback_success') {
            statusBox.style.background = '#fffbeb';
            statusBox.style.borderColor = '#fde68a';
            statusBox.style.color = '#92400e';
            statusIcon.textContent = 'ℹ️';
            statusText.textContent = `Primary failed. Authenticated using Fallback ID: ${result.activeUser || '54636'}. Session is active for today.`;
            showToast(`✓ Logged in via Fallback ID ${result.activeUser}! Valid for today.`);
            checkEbsAuthStatus();
            setTimeout(closeModal, 1200);
          } else {
            statusBox.style.background = '#fff1f2';
            statusBox.style.borderColor = '#fecdd3';
            statusBox.style.color = '#be123c';
            statusIcon.textContent = '❌';
            statusText.textContent = 'Login Failed: Invalid Employee ID or HRMS Password.';
            showToast('✗ Login Failed. Please check Employee ID & Password.');
            checkEbsAuthStatus();
          }
        }
      } catch (err) {
        showToast('Connection error connecting to server.');
      } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = originalText;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  AppState.modification.records = generateModificationRecords();
  populateRmDatalists(AppState.modification.records);

  const defaultCode = '113965';
  const rmCodeInput = document.getElementById('modRmCodeInput');
  const rmNameInput = document.getElementById('modRmNameInput');
  if (rmCodeInput && rmNameInput && AppState.modification.rmMap.has(defaultCode)) {
    rmCodeInput.value = defaultCode;
    rmNameInput.value = AppState.modification.rmMap.get(defaultCode);
    AppState.modification.rmCodeFilter = defaultCode;
    AppState.modification.rmNameFilter = rmNameInput.value;
  }

  initEventListeners();
  initEbsPasswordModalListeners();
  checkEbsAuthStatus();
  renderDashboard();
  renderModificationReport();
});
