// Walton Active BOM Explorer, Floor Cross-Verifier & Deviation Analyzer Logic

(function() {
  'use strict';

  // -------------------------------------------------------------
  // Data State
  // -------------------------------------------------------------
  const allItems = typeof ACTIVE_BOM_CATALOG !== 'undefined' ? ACTIVE_BOM_CATALOG : [];
  const bomCache = typeof BOM_CACHE !== 'undefined' ? BOM_CACHE : {};
  const availableBoms = typeof AVAILABLE_BOMS !== 'undefined' ? AVAILABLE_BOMS : new Set();
  let filteredItems = [...allItems];
  let selectedItem = null;
  let currentBomData = null;
  let activeTableComponents = [];

  // Single Explorer Pagination
  let currentPage = 1;
  const pageSize = 25;

  // Deviation State & Slicers
  let currentDevFilter = 'DIFF'; // 'DIFF' | 'ADDED' | 'REMOVED' | 'CHANGED' | 'SAME' | 'ALL'
  let currentCategoryFilter = 'ALL';
  let currentCostFilter = 'ALL'; // 'ALL' | 'INCREASE' | 'SAVINGS' | 'ZERO'
  let currentRmGroupFilter = 'ALL';
  let isGroupedView = false;
  let currentDeviationData = null;

  // -------------------------------------------------------------
  // DOM Elements - Mode Navigation
  // -------------------------------------------------------------
  const tabBtnDeviation = document.getElementById('tabBtnDeviation');
  const tabBtnExplorer = document.getElementById('tabBtnExplorer');
  const tabBtnWhereUsed = document.getElementById('tabBtnWhereUsed');
  const viewBOMDeviation = document.getElementById('viewBOMDeviation');
  const viewSingleExplorer = document.getElementById('viewSingleExplorer');
  const viewRmWhereUsed = document.getElementById('viewRmWhereUsed');

  // -------------------------------------------------------------
  // DOM Elements & State - RM Where-Used Finder
  // -------------------------------------------------------------
  const whereUsedRmCode = document.getElementById('whereUsedRmCode');
  const btnClearWhereUsedRm = document.getElementById('btnClearWhereUsedRm');
  const whereUsedRmNameInput = document.getElementById('whereUsedRmNameInput');
  const btnClearWhereUsedRmName = document.getElementById('btnClearWhereUsedRmName');
  const whereUsedRmSuggestDropdown = document.getElementById('whereUsedRmSuggestDropdown');
  const wuRmNameMatchBadge = document.getElementById('wuRmNameMatchBadge');
  const whereUsedOrgFilter = document.getElementById('whereUsedOrgFilter');
  const whereUsedTypeFilter = document.getElementById('whereUsedTypeFilter');
  const btnSearchWhereUsed = document.getElementById('btnSearchWhereUsed');
  const btnResetWhereUsed = document.getElementById('btnResetWhereUsed');
  const whereUsedLoadingNotice = document.getElementById('whereUsedLoadingNotice');
  const whereUsedEmptyPrompt = document.getElementById('whereUsedEmptyPrompt');
  const whereUsedResultsSection = document.getElementById('whereUsedResultsSection');
  const wuHeaderRmCode = document.getElementById('wuHeaderRmCode');
  const wuHeaderRmName = document.getElementById('wuHeaderRmName');
  const wuHeaderUom = document.getElementById('wuHeaderUom');
  const wuHeaderUnitPrice = document.getElementById('wuHeaderUnitPrice');
  const wuHeaderTotalCount = document.getElementById('wuHeaderTotalCount');
  const wuHeaderRacCount = document.getElementById('wuHeaderRacCount');
  const wuHeaderCacCount = document.getElementById('wuHeaderCacCount');
  const wuHeaderChillerCount = document.getElementById('wuHeaderChillerCount');
  const wuHeaderTotalValue = document.getElementById('wuHeaderTotalValue');
  const wuPageSizeSelect = document.getElementById('wuPageSizeSelect');
  const btnExportWhereUsedXlsx = document.getElementById('btnExportWhereUsedXlsx');
  const btnExportWhereUsedCsv = document.getElementById('btnExportWhereUsedCsv');
  const wuTableSearchInput = document.getElementById('wuTableSearchInput');
  const whereUsedTable = document.getElementById('whereUsedTable');
  const whereUsedTableBody = document.getElementById('whereUsedTableBody');
  const whereUsedTableFoot = document.getElementById('whereUsedTableFoot');
  const wuFootPageQty = document.getElementById('wuFootPageQty');
  const wuFootPageValue = document.getElementById('wuFootPageValue');
  const wuPageStart = document.getElementById('wuPageStart');
  const wuPageEnd = document.getElementById('wuPageEnd');
  const wuPageTotal = document.getElementById('wuPageTotal');
  const wuFilteredNote = document.getElementById('wuFilteredNote');
  const wuRawTotal = document.getElementById('wuRawTotal');
  const wuPaginationControls = document.getElementById('wuPaginationControls');

  let whereUsedActiveRm = '';
  let whereUsedCurrentRows = [];
  let whereUsedFilteredRows = [];
  let whereUsedCurrentPage = 1;
  let whereUsedPageSize = 25;

  // -------------------------------------------------------------
  // DOM Elements - Deviation Analyzer & Slicers
  // -------------------------------------------------------------
  const devBeforeItemCode = document.getElementById('devBeforeItemCode');
  const btnClearBeforeCode = document.getElementById('btnClearBeforeCode');
  const devBeforeVersion = document.getElementById('devBeforeVersion');
  const beforeStatusBadge = document.getElementById('beforeStatusBadge');
  const beforeModelInfo = document.getElementById('beforeModelInfo');

  const devAfterItemCode = document.getElementById('devAfterItemCode');
  const btnClearAfterCode = document.getElementById('btnClearAfterCode');
  const devAfterVersion = document.getElementById('devAfterVersion');
  const afterStatusBadge = document.getElementById('afterStatusBadge');
  const afterModelInfo = document.getElementById('afterModelInfo');

  const btnActionCompare = document.getElementById('btnActionCompare');
  const btnSwapBeforeAfter = document.getElementById('btnSwapBeforeAfter');
  const btnCloneBeforeToAfter = document.getElementById('btnCloneBeforeToAfter');
  const btnLoadSampleDev = document.getElementById('btnLoadSampleDev');
  const btnClearAllFilters = document.getElementById('btnClearAllFilters');
  const catalogCodeList = document.getElementById('catalogCodeList');

  // Slicers
  const slicerStatusPills = document.querySelectorAll('#slicerStatusPills .slicer-pill');
  const countFilterDiff = document.getElementById('countFilterDiff');
  const countFilterAdded = document.getElementById('countFilterAdded');
  const countFilterRemoved = document.getElementById('countFilterRemoved');
  const countFilterChanged = document.getElementById('countFilterChanged');
  const countFilterSame = document.getElementById('countFilterSame');
  const countFilterAll = document.getElementById('countFilterAll');

  const slicerCategory = document.getElementById('slicerCategory');
  const slicerCost = document.getElementById('slicerCost');
  const devTableSearch = document.getElementById('devTableSearch');
  const filterRmNameDesc = document.getElementById('filterRmNameDesc');
  const btnClearRmNameFilter = document.getElementById('btnClearRmNameFilter');
  const slicerRmGroup = document.getElementById('slicerRmGroup');
  const btnResetSlicers = document.getElementById('btnResetSlicers');
  const btnToggleGroupView = document.getElementById('btnToggleGroupView');
  const textToggleGroupView = document.getElementById('textToggleGroupView');

  // Deviation Results
  const deviationResultsSection = document.getElementById('deviationResultsSection');
  const devMatchCountText = document.getElementById('devMatchCountText');
  const kpiBeforeCost = document.getElementById('kpiBeforeCost');
  const kpiBeforeCount = document.getElementById('kpiBeforeCount');
  const kpiAfterCost = document.getElementById('kpiAfterCost');
  const kpiAfterCount = document.getElementById('kpiAfterCount');
  const kpiCostDiffCard = document.getElementById('kpiCostDiffCard');
  const kpiCostDiff = document.getElementById('kpiCostDiff');
  const kpiCostDiffPct = document.getElementById('kpiCostDiffPct');
  const kpiAddedCount = document.getElementById('kpiAddedCount');
  const kpiRemovedCount = document.getElementById('kpiRemovedCount');
  const kpiChangedCount = document.getElementById('kpiChangedCount');

  const deviationTableBody = document.getElementById('deviationTableBody');
  const btnExportDevExcel = document.getElementById('btnExportDevExcel');
  const btnExportDevCsv = document.getElementById('btnExportDevCsv');

  // -------------------------------------------------------------
  // DOM Elements - Single BOM Explorer & Floor Physical Audit Box
  // -------------------------------------------------------------
  const searchItemCode = document.getElementById('searchItemCode');
  const btnClearItemCode = document.getElementById('btnClearItemCode');
  const searchVersion = document.getElementById('searchVersion');
  const btnClearVersion = document.getElementById('btnClearVersion');
  const btnResetSearch = document.getElementById('btnResetSearch');
  const filterOrg = document.getElementById('filterOrg');
  const filterCache = document.getElementById('filterCache');
  const resultsCountText = document.getElementById('resultsCountText');
  const catalogListContainer = document.getElementById('catalogListContainer');
  const pageIndicator = document.getElementById('pageIndicator');
  const pageSummary = document.getElementById('pageSummary');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');

  // Floor Observation Message Box Elements (Marked in Orange by User)
  const txtFloorObsMsg = document.getElementById('txtFloorObsMsg');
  const btnLoadSampleFloorMsg = document.getElementById('btnLoadSampleFloorMsg');
  const btnClearFloorMsg = document.getElementById('btnClearFloorMsg');
  const btnGenerateFloorReport = document.getElementById('btnGenerateFloorReport');
  const floorMsgParsedBadge = document.getElementById('floorMsgParsedBadge');

  // Floor Deviation Report Elements
  const floorDeviationReportSection = document.getElementById('floorDeviationReportSection');
  const floorReportSubtitle = document.getElementById('floorReportSubtitle');
  const btnExportFloorExcel = document.getElementById('btnExportFloorExcel');
  const btnExportFloorCsv = document.getElementById('btnExportFloorCsv');
  const btnCloseFloorReport = document.getElementById('btnCloseFloorReport');
  const kpiFloorBomCost = document.getElementById('kpiFloorBomCost');
  const kpiFloorAuditedCount = document.getElementById('kpiFloorAuditedCount');
  const kpiFloorObsCost = document.getElementById('kpiFloorObsCost');
  const kpiFloorCostDiffCard = document.getElementById('kpiFloorCostDiffCard');
  const kpiFloorCostDiff = document.getElementById('kpiFloorCostDiff');
  const kpiFloorCostDiffPct = document.getElementById('kpiFloorCostDiffPct');
  const kpiFloorExcessCount = document.getElementById('kpiFloorExcessCount');
  const kpiFloorSavingsCount = document.getElementById('kpiFloorSavingsCount');
  const kpiFloorMatchCount = document.getElementById('kpiFloorMatchCount');
  const kpiFloorUnlistedCount = document.getElementById('kpiFloorUnlistedCount');

  const countFloorAll = document.getElementById('countFloorAll');
  const countFloorDiff = document.getElementById('countFloorDiff');
  const countFloorExcess = document.getElementById('countFloorExcess');
  const countFloorSavings = document.getElementById('countFloorSavings');
  const countFloorMatch = document.getElementById('countFloorMatch');
  const countFloorUnlisted = document.getElementById('countFloorUnlisted');

  const floorReportSearch = document.getElementById('floorReportSearch');
  const floorReportTableBody = document.getElementById('floorReportTableBody');

  // Floor Audit State
  let currentFloorObsData = null;
  let currentFloorFilter = 'ALL';
  const floorAuditedMap = new Map();

  // Related Platform Sibling Models & Concern R&I Email Elements
  const relatedVersionsContainer = document.getElementById('relatedVersionsContainer');
  const relatedVersionsBadge = document.getElementById('relatedVersionsBadge');
  const relatedPlatformSummary = document.getElementById('relatedPlatformSummary');
  const relatedSiblingsList = document.getElementById('relatedSiblingsList');
  const btnCopyRelatedCodes = document.getElementById('btnCopyRelatedCodes');
  const btnOpenRiEmailModal = document.getElementById('btnOpenRiEmailModal');
  const btnOpenRiEmailTop = document.getElementById('btnOpenRiEmailTop');
  const relatedOtherCollapsible = document.getElementById('relatedOtherCollapsible');
  const relatedOtherToggleBtn = document.getElementById('relatedOtherToggleBtn');
  const relatedOtherSiblingsList = document.getElementById('relatedOtherSiblingsList');

  // Concern R&I Email Modal Elements
  const riEmailModal = document.getElementById('riEmailModal');
  const btnCloseRiEmailModal = document.getElementById('btnCloseRiEmailModal');
  const btnCloseRiEmailModalBottom = document.getElementById('btnCloseRiEmailModalBottom');
  const riEmailSubject = document.getElementById('riEmailSubject');
  const btnCopySubject = document.getElementById('btnCopySubject');
  const riEmailTo = document.getElementById('riEmailTo');
  const btnCopyEmailTo = document.getElementById('btnCopyEmailTo');
  const riEmailCc = document.getElementById('riEmailCc');
  const btnCopyEmailCc = document.getElementById('btnCopyEmailCc');
  const modalSelectedFgCount = document.getElementById('modalSelectedFgCount');
  const modalSiblingBadges = document.getElementById('modalSiblingBadges');
  const riEmailPreviewContainer = document.getElementById('riEmailPreviewContainer');
  const btnCopyEmailHtml = document.getElementById('btnCopyEmailHtml');
  const btnCopyEmailText = document.getElementById('btnCopyEmailText');
  const btnOpenInOutlook = document.getElementById('btnOpenInOutlook');
  const btnSelectEmailContent = document.getElementById('btnSelectEmailContent');
  const emailCopiedFeedback = document.getElementById('emailCopiedFeedback');

  // Related Models State
  let currentRelatedData = null;
  let selectedSiblingCodes = new Set();

  // Stats Ribbon
  const statTotal = document.getElementById('statTotal');
  const statRac = document.getElementById('statRac');
  const statCac = document.getElementById('statCac');
  const statLoadedBoms = document.getElementById('statLoadedBoms');
  const badgeTotalItems = document.getElementById('badgeTotalItems');

  // Workspace
  const emptyState = document.getElementById('emptyState');
  const selectedModelView = document.getElementById('selectedModelView');
  const mItemName = document.getElementById('mItemName');
  const mItemCode = document.getElementById('mItemCode');
  const mVersion = document.getElementById('mVersion');
  const mOrg = document.getElementById('mOrg');
  const mUOM = document.getElementById('mUOM');
  const mRMCost = document.getElementById('mRMCost');
  const mTotalRM = document.getElementById('mTotalRM');
  const btnLiveEbs = document.getElementById('btnLiveEbs');
  const btnCompareCurrentModel = document.getElementById('btnCompareCurrentModel');
  const notLoadedNotice = document.getElementById('notLoadedNotice');
  const cmdCode = document.getElementById('cmdCode');
  const cmdVer = document.getElementById('cmdVer');
  const btnCopyCmd = document.getElementById('btnCopyCmd');

  // Single BOM Floor Cross-Verification
  const inputVerifyRmCode = document.getElementById('inputVerifyRmCode');
  const inputPhysicalQty = document.getElementById('inputPhysicalQty');
  const btnRunVerification = document.getElementById('btnRunVerification');
  const btnClearVerification = document.getElementById('btnClearVerification');
  const verifyResultCard = document.getElementById('verifyResultCard');

  // Single BOM Table
  const bomTableSearch = document.getElementById('bomTableSearch');
  const componentCountBadge = document.getElementById('componentCountBadge');
  const bomTableBody = document.getElementById('bomTableBody');
  const btnExportExcel = document.getElementById('btnExportExcel');
  const btnExportCsv = document.getElementById('btnExportCsv');

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  function init() {
    updateStats();
    populateCatalogDatalist();
    applyFilters();
    bindEvents();
    bindDeviationEvents();
    bindWhereUsedEvents();

    const btnSyncStatus = document.getElementById('btnSyncStatus');
    if (btnSyncStatus) {
      btnSyncStatus.addEventListener('click', () => {
        alert("Walton EBS Component Database:\n\n• 3,406 Active BOMs downloaded and ready.\n• All raw material components cached in /boms/*.json.\n\nTo run daily automatic sync with Walton EBS, execute in PowerShell:\n.\\sync_all_boms.ps1");
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    if (mode === 'explorer') {
      switchView('explorer');
      const queryItem = urlParams.get('item');
      const queryVer = urlParams.get('version');
      if (queryItem || queryVer) {
        if (queryItem && searchItemCode) searchItemCode.value = queryItem;
        if (queryVer && searchVersion) searchVersion.value = queryVer;
        applyFilters();
        if (filteredItems.length > 0) {
          selectItem(filteredItems[0]);
        }
      }
    } else if (mode === 'whereused') {
      switchView('whereused');
      const rmQuery = urlParams.get('rm') || urlParams.get('rmCode');
      const rmNameQuery = urlParams.get('rmName') || urlParams.get('name');
      const orgParam = urlParams.get('org');
      const typeParam = urlParams.get('type');
      if (orgParam && whereUsedOrgFilter) whereUsedOrgFilter.value = orgParam;
      if (typeParam && whereUsedTypeFilter) whereUsedTypeFilter.value = typeParam;
      if (rmQuery) {
        if (whereUsedRmCode) whereUsedRmCode.value = rmQuery;
        runWhereUsedSearch(rmQuery);
      } else if (rmNameQuery) {
        if (whereUsedRmNameInput) whereUsedRmNameInput.value = rmNameQuery;
        executeWhereUsedFromInputs();
      }
    } else {
      // Default to Deviation View
      switchView('deviation');
      const bCode = urlParams.get('before');
      const bVer = urlParams.get('beforeVer');
      const aCode = urlParams.get('after');
      const aVer = urlParams.get('afterVer');

      if (bCode && aCode) {
        devBeforeItemCode.value = bCode;
        handleCodeInput('before');
        if (bVer) devBeforeVersion.value = bVer;
        updateModelInfoDisplay('before');

        devAfterItemCode.value = aCode;
        handleCodeInput('after');
        if (aVer) devAfterVersion.value = aVer;
        updateModelInfoDisplay('after');

        runBOMDeviationAnalysis();
      } else {
        // Auto-load sample 448516 (FREDO-0201 vs FREDO-0302) for immediate green mark visualization!
        loadSampleDeviation();
      }
    }
  }

  // -------------------------------------------------------------
  // View Switching (Tabs)
  // -------------------------------------------------------------
  function switchView(mode) {
    if (tabBtnDeviation) tabBtnDeviation.classList.remove('active');
    if (tabBtnExplorer) tabBtnExplorer.classList.remove('active');
    if (tabBtnWhereUsed) tabBtnWhereUsed.classList.remove('active');

    if (viewBOMDeviation) viewBOMDeviation.style.display = 'none';
    if (viewSingleExplorer) viewSingleExplorer.style.display = 'none';
    if (viewRmWhereUsed) viewRmWhereUsed.style.display = 'none';

    if (mode === 'whereused') {
      if (tabBtnWhereUsed) tabBtnWhereUsed.classList.add('active');
      if (viewRmWhereUsed) viewRmWhereUsed.style.display = 'block';
      ensureWhereUsedDataReady();
    } else if (mode === 'explorer') {
      if (tabBtnExplorer) tabBtnExplorer.classList.add('active');
      if (viewSingleExplorer) viewSingleExplorer.style.display = 'block';
    } else {
      if (tabBtnDeviation) tabBtnDeviation.classList.add('active');
      if (viewBOMDeviation) viewBOMDeviation.style.display = 'block';
    }
  }

  // -------------------------------------------------------------
  // BOM Cache & Fetch Helpers
  // -------------------------------------------------------------
  function getCachedBomByKey(itemCode, version) {
    if (!itemCode) return null;
    const code = String(itemCode).trim();
    const ver = (version || '').trim();

    if (ver && bomCache[`${code}_${ver}`]) {
      return bomCache[`${code}_${ver}`];
    }
    if (bomCache[`${code}_default`]) {
      return bomCache[`${code}_default`];
    }
    if (bomCache[code]) {
      return bomCache[code];
    }

    const allKeys = Object.keys(bomCache);
    if (ver) {
      const matchKey = allKeys.find(k => k.toLowerCase() === `${code}_${ver}`.toLowerCase());
      if (matchKey) return bomCache[matchKey];
    }
    const matchPrefix = allKeys.find(k => k.startsWith(`${code}_`) || k === code);
    if (matchPrefix) return bomCache[matchPrefix];

    return null;
  }

  function isItemAvailable(itemCode, version) {
    if (!itemCode) return false;
    const code = String(itemCode).trim();
    const ver = (version || '').trim();
    if (bomCache[`${code}_${ver}`] || bomCache[`${code}_default`] || bomCache[code]) return true;
    if (availableBoms.has(`${code}_${ver}`) || availableBoms.has(code) || availableBoms.has(`${code}_default`) || availableBoms.has(`${code}_Standard`)) return true;
    for (const key of availableBoms) {
      if (key.startsWith(`${code}_`) || key === code) return true;
    }
    return false;
  }

  function isItemCached(item) {
    if (!item) return false;
    return isItemAvailable(item.ItemCode, item.Version);
  }

  function getCachedBom(item) {
    if (!item) return null;
    return getCachedBomByKey(item.ItemCode, item.Version);
  }

  async function getOrFetchBom(itemCode, version) {
    if (!itemCode) return null;
    const code = String(itemCode).trim();
    const ver = (version || '').trim();

    let bom = getCachedBomByKey(code, ver);
    if (bom && bom.Components && bom.Components.length > 0) {
      return bom;
    }

    const candidateFiles = [];
    if (ver) {
      candidateFiles.push(`${code}_${ver}.json`);
    }
    candidateFiles.push(`${code}_Standard.json`, `${code}_default.json`, `${code}.json`);

    // Check availableBoms for exact or prefix matches
    if (availableBoms && availableBoms.size > 0) {
      for (const key of availableBoms) {
        if (ver && key.toLowerCase() === `${code}_${ver}`.toLowerCase()) {
          const fn = `${key}.json`;
          if (!candidateFiles.includes(fn)) candidateFiles.unshift(fn);
        } else if (key.startsWith(`${code}_`)) {
          const fn = `${key}.json`;
          if (!candidateFiles.includes(fn)) candidateFiles.push(fn);
        }
      }
    }

    for (const filename of candidateFiles) {
      try {
        const res = await fetch('boms/' + encodeURIComponent(filename));
        if (res.ok) {
          const data = await res.json();
          if (data && data.Components && data.Components.length > 0) {
            const key = ver ? `${code}_${ver}` : code;
            bomCache[key] = data;
            bomCache[`${code}_${data.Version || ver}`] = data;
            return data;
          }
        }
      } catch (err) {
        // Fallback to next candidate
      }
    }

    return null;
  }

  function updateStats() {
    if (statTotal) statTotal.textContent = allItems.length.toLocaleString();
    if (badgeTotalItems) badgeTotalItems.textContent = `${allItems.length.toLocaleString()} Items`;

    const racCount = allItems.filter(i => i.Org === 'RAC').length;
    const cacCount = allItems.filter(i => i.Org === 'CAC').length;
    if (statRac) statRac.textContent = racCount.toLocaleString();
    if (statCac) statCac.textContent = cacCount.toLocaleString();

    const loadedCount = Math.max(Object.keys(bomCache).length, availableBoms.size);
    if (statLoadedBoms) statLoadedBoms.textContent = loadedCount.toLocaleString();
  }

  function populateCatalogDatalist() {
    if (!catalogCodeList) return;
    catalogCodeList.innerHTML = '';
    const seen = new Set();
    const fragment = document.createDocumentFragment();

    allItems.forEach(item => {
      if (item.ItemCode && !seen.has(item.ItemCode)) {
        seen.add(item.ItemCode);
        const opt = document.createElement('option');
        opt.value = item.ItemCode;
        const shortName = item.ItemName ? item.ItemName.substring(0, 42) : '';
        opt.label = `${item.ItemCode} - ${shortName}`;
        fragment.appendChild(opt);
      }
    });

    catalogCodeList.appendChild(fragment);
  }

  // -------------------------------------------------------------
  // Deviation View: Input & Version Handlers
  // -------------------------------------------------------------
  function handleCodeInput(side) {
    const isBefore = side === 'before';
    const codeInput = isBefore ? devBeforeItemCode : devAfterItemCode;
    const clearBtn = isBefore ? btnClearBeforeCode : btnClearAfterCode;
    const verSelect = isBefore ? devBeforeVersion : devAfterVersion;
    const infoPill = isBefore ? beforeModelInfo : afterModelInfo;
    const badge = isBefore ? beforeStatusBadge : afterStatusBadge;

    if (!codeInput || !verSelect) return;
    const code = (codeInput.value || '').trim();
    if (clearBtn) clearBtn.style.display = code ? 'block' : 'none';

    verSelect.innerHTML = '<option value="">Select Version</option>';

    if (!code) {
      if (infoPill) infoPill.innerHTML = '<span style="color: #94a3b8;">Enter Item Code to preview model info</span>';
      if (badge) {
        badge.textContent = 'Not Selected';
        badge.style.background = '#94a3b8';
      }
      return;
    }

    const matches = allItems.filter(it => String(it.ItemCode).trim() === code);

    if (matches.length === 0) {
      if (infoPill) infoPill.innerHTML = `<span style="color: #ef4444; font-weight: 600;">⚠️ Item Code #${escapeHtml(code)} not found in Active Catalog</span>`;
      if (badge) {
        badge.textContent = 'Not Found';
        badge.style.background = '#ef4444';
      }
      return;
    }

    const versions = [];
    matches.forEach(m => {
      const v = (m.Version || 'Standard').trim();
      if (!versions.includes(v)) versions.push(v);
    });

    versions.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      verSelect.appendChild(opt);
    });

    if (versions.length > 0) {
      verSelect.value = versions[0];
    }

    updateModelInfoDisplay(side);
  }

  function updateModelInfoDisplay(side) {
    const isBefore = side === 'before';
    const codeInput = isBefore ? devBeforeItemCode : devAfterItemCode;
    const verSelect = isBefore ? devBeforeVersion : devAfterVersion;
    const infoPill = isBefore ? beforeModelInfo : afterModelInfo;
    const badge = isBefore ? beforeStatusBadge : afterStatusBadge;

    if (!codeInput || !verSelect || !infoPill || !badge) return;
    const code = (codeInput.value || '').trim();
    const ver = (verSelect.value || '').trim();

    if (!code) return;

    const item = allItems.find(it => 
      String(it.ItemCode).trim() === code && 
      ((it.Version || 'Standard').trim().toLowerCase() === ver.toLowerCase() || !ver)
    ) || allItems.find(it => String(it.ItemCode).trim() === code);

    if (!item) return;

    const cachedBom = getCachedBomByKey(code, ver);
    const available = isItemAvailable(code, ver);
    if (cachedBom && cachedBom.Components && cachedBom.Components.length > 0) {
      badge.textContent = `🟢 Ready (${cachedBom.Components.length} RMs)`;
      badge.style.background = '#10b981';
    } else if (available) {
      badge.textContent = '🟢 Ready (Downloaded)';
      badge.style.background = '#10b981';
    } else {
      badge.textContent = '🟡 Online Only (EBS)';
      badge.style.background = '#f59e0b';
    }

    infoPill.innerHTML = `
      <div style="font-weight: 700; color: #1e293b; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.ItemName)}">
        ${escapeHtml(item.ItemName)}
      </div>
      <div style="display: flex; gap: 8px; margin-top: 3px; font-size: 11.5px; color: #64748b; flex-wrap: wrap;">
        <span><strong>Org:</strong> ${item.Org || '-'}</span>
        <span><strong>UOM:</strong> ${item.UOM || 'PCS'}</span>
        <span><strong>Cost:</strong> ৳${formatNum(item.RMCost)}</span>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // Helper Actions (Swap, Clone, Sample, Clear Filters)
  // -------------------------------------------------------------
  function swapBeforeAfter() {
    const bCode = devBeforeItemCode.value;
    const bVer = devBeforeVersion.value;
    const aCode = devAfterItemCode.value;
    const aVer = devAfterVersion.value;

    devBeforeItemCode.value = aCode;
    handleCodeInput('before');
    devBeforeVersion.value = aVer;
    updateModelInfoDisplay('before');

    devAfterItemCode.value = bCode;
    handleCodeInput('after');
    devAfterVersion.value = bVer;
    updateModelInfoDisplay('after');

    if (currentDeviationData) {
      runBOMDeviationAnalysis();
    }
  }

  function cloneBeforeToAfter() {
    const bCode = (devBeforeItemCode.value || '').trim();
    if (!bCode) {
      alert('Please enter a Before Item Code first.');
      return;
    }

    devAfterItemCode.value = bCode;
    handleCodeInput('after');

    const bVer = devBeforeVersion.value;
    const options = Array.from(devAfterVersion.options).map(o => o.value).filter(v => v);
    if (options.length > 1) {
      const otherVer = options.find(v => v !== bVer) || options[0];
      devAfterVersion.value = otherVer;
    }
    updateModelInfoDisplay('after');
  }

  function loadSampleDeviation() {
    // 448516: FREDO-0201 vs FREDO-0302
    devBeforeItemCode.value = '448516';
    handleCodeInput('before');
    devBeforeVersion.value = 'FREDO-0201';
    updateModelInfoDisplay('before');

    devAfterItemCode.value = '448516';
    handleCodeInput('after');
    devAfterVersion.value = 'FREDO-0302';
    updateModelInfoDisplay('after');

    runBOMDeviationAnalysis();
  }

  function clearAllFilters() {
    devBeforeItemCode.value = '';
    handleCodeInput('before');
    devAfterItemCode.value = '';
    handleCodeInput('after');

    resetSlicers();
    if (deviationResultsSection) {
      deviationResultsSection.style.display = 'none';
    }
    currentDeviationData = null;
  }

  function resetSlicers() {
    currentDevFilter = 'DIFF';
    currentCategoryFilter = 'ALL';
    currentCostFilter = 'ALL';
    currentRmGroupFilter = 'ALL';
    if (devTableSearch) devTableSearch.value = '';
    if (filterRmNameDesc) filterRmNameDesc.value = '';
    if (btnClearRmNameFilter) btnClearRmNameFilter.style.display = 'none';

    slicerStatusPills.forEach(p => {
      p.classList.remove('active');
      if (p.getAttribute('data-filter') === 'DIFF') p.classList.add('active');
    });

    if (slicerCategory) slicerCategory.value = 'ALL';
    if (slicerCost) slicerCost.value = 'ALL';
    if (slicerRmGroup) slicerRmGroup.value = 'ALL';

    if (currentDeviationData) {
      renderDeviationTable();
    }
  }

  // -------------------------------------------------------------
  // Intelligent RM Component Subsystem Classifier & Badges
  // -------------------------------------------------------------
  const RM_GROUP_CONFIG = {
    'CARTON': { label: 'CARTON', icon: '📦', bg: '#fae8ff', color: '#86198f', border: '#f5d0fe', order: 1 },
    'PCB': { label: 'PCB', icon: '📟', bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe', order: 2 },
    'Motor': { label: 'Motor', icon: '⚙️', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', order: 3 },
    'MOTOR': { label: 'Motor', icon: '⚙️', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', order: 3 },
    'STEPPER MOTOR': { label: 'STEPPER MOTOR', icon: '🔄', bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd', order: 4 },
    'COMPRESSOR': { label: 'COMPRESSOR', icon: '🗜️', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', order: 5 },
    'CABLE': { label: 'CABLE', icon: '🔌', bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', order: 6 },
    'Service Cable': { label: 'Service Cable', icon: '🔌', bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', order: 7 },
    'Power Cable': { label: 'Power Cable', icon: '🔌', bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', order: 8 },
    'STICKER': { label: 'STICKER', icon: '🏷️', bg: '#fdf4ff', color: '#a21caf', border: '#f0abfc', order: 9 },
    'Combine Sticker': { label: 'Combine Sticker', icon: '🏷️', bg: '#fdf4ff', color: '#a21caf', border: '#f0abfc', order: 10 },
    'BARCODE LABEL': { label: 'BARCODE LABEL', icon: '🏷️', bg: '#fdf4ff', color: '#a21caf', border: '#f0abfc', order: 11 },
    'BARCODE RIBBON': { label: 'BARCODE RIBBON', icon: '🏷️', bg: '#fdf4ff', color: '#a21caf', border: '#f0abfc', order: 12 },
    'Sensor': { label: 'Sensor', icon: '🌡️', bg: '#ffedd5', color: '#c2410c', border: '#fed7aa', order: 13 },
    'SENSOR': { label: 'Sensor', icon: '🌡️', bg: '#ffedd5', color: '#c2410c', border: '#fed7aa', order: 13 },
    'SHEET METAL': { label: 'SHEET METAL', icon: '🏗️', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', order: 14 },
    'ALUZINC SHEET': { label: 'ALUZINC SHEET', icon: '🏗️', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', order: 15 },
    'Display': { label: 'Display', icon: '🖥️', bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe', order: 16 },
    'Display Cover': { label: 'Display Cover', icon: '🖥️', bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe', order: 17 },
    'evaporator': { label: 'Evaporator', icon: '❄️', bg: '#cffafe', color: '#0e7490', border: '#a5f3fc', order: 18 },
    'EVAPORATOR': { label: 'Evaporator', icon: '❄️', bg: '#cffafe', color: '#0e7490', border: '#a5f3fc', order: 18 },
    'Evaporator': { label: 'Evaporator', icon: '❄️', bg: '#cffafe', color: '#0e7490', border: '#a5f3fc', order: 18 },
    'CONDENSER': { label: 'CONDENSER', icon: '🧊', bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4', order: 19 },
    'Top Panel': { label: 'Top Panel', icon: '🚪', bg: '#f8fafc', color: '#1e293b', border: '#e2e8f0', order: 20 },
    'Front Panel': { label: 'Front Panel', icon: '🚪', bg: '#f8fafc', color: '#1e293b', border: '#e2e8f0', order: 21 },
    'Side Cover': { label: 'Side Cover', icon: '🛡️', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', order: 22 },
    'Back Net': { label: 'Back Net', icon: '🛡️', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', order: 23 },
    'Front Net': { label: 'Front Net', icon: '🛡️', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', order: 24 },
    'COPPER TUBE': { label: 'COPPER TUBE', icon: '🪈', bg: '#fed7aa', color: '#9a3412', border: '#fdba74', order: 25 },
    'CAPILLARY TUBE': { label: 'CAPILLARY TUBE', icon: '🪈', bg: '#fed7aa', color: '#9a3412', border: '#fdba74', order: 26 },
    'Service Pipe': { label: 'Service Pipe', icon: '🪈', bg: '#fed7aa', color: '#9a3412', border: '#fdba74', order: 27 },
    'SCREW': { label: 'SCREW', icon: '🔩', bg: '#f8fafc', color: '#475569', border: '#e2e8f0', order: 28 },
    'ODU BASE': { label: 'ODU BASE', icon: '🧱', bg: '#fef3c7', color: '#92400e', border: '#fde68a', order: 29 },
    'IDU BASE': { label: 'IDU BASE', icon: '🧱', bg: '#fef3c7', color: '#92400e', border: '#fde68a', order: 30 },
    'MANUAL': { label: 'MANUAL', icon: '📖', bg: '#fef9c3', color: '#854d0e', border: '#fde047', order: 31 },
    'SERVICE VALVE': { label: 'SERVICE VALVE', icon: '🚰', bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe', order: 32 },
    'VALVE': { label: 'VALVE', icon: '🚰', bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe', order: 32 },
    'CONNECTOR': { label: 'CONNECTOR', icon: '🔗', bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe', order: 33 },
    'CHEMICAL': { label: 'CHEMICAL', icon: '🧪', bg: '#ffe4e6', color: '#be123c', border: '#fecdd3', order: 34 },
    'PAINT': { label: 'PAINT', icon: '🎨', bg: '#ffe4e6', color: '#be123c', border: '#fecdd3', order: 35 },
    'INK': { label: 'INK', icon: '🖋️', bg: '#ffe4e6', color: '#be123c', border: '#fecdd3', order: 36 },
    'INSULATION PIPE': { label: 'INSULATION PIPE', icon: '🧥', bg: '#ecfccb', color: '#4d7c0f', border: '#d9f99d', order: 37 },
    'REMOTE': { label: 'REMOTE', icon: '📱', bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff', order: 38 },
    'HEADER': { label: 'HEADER', icon: '🔀', bg: '#ccfbf1', color: '#115e59', border: '#99f6e4', order: 39 },
    'CAPACITOR': { label: 'CAPACITOR', icon: '🔋', bg: '#fef08a', color: '#854d0e', border: '#fde047', order: 40 },
    'FAN': { label: 'FAN', icon: '🌀', bg: '#e0f2fe', color: '#0284c7', border: '#7dd3fc', order: 41 },
    'Blower': { label: 'Blower', icon: '🌀', bg: '#e0f2fe', color: '#0284c7', border: '#7dd3fc', order: 42 },
    'Louver': { label: 'Louver', icon: '🪟', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', order: 43 },
    'Vertical Vane': { label: 'Vertical Vane', icon: '🪟', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', order: 44 },
    'Other': { label: 'Other RM', icon: '🧩', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', order: 99 }
  };

  function classifyRmComponent(name, code, category) {
    // 1. Primary Source: Exact Master Mapping from Excel Sheet (RAC NEW BOM CHECK...4.xlsm)
    if (code && typeof RM_CODE_TO_GROUP !== 'undefined') {
      const cleanCode = String(code).trim();
      if (RM_CODE_TO_GROUP[cleanCode]) {
        return RM_CODE_TO_GROUP[cleanCode];
      }
    }

    if (!name) return 'Other';
    const n = String(name).toLowerCase();
    const c = String(category || '').toLowerCase();

    // 2. Secondary Source: Rule-based classification adhering to the Excel's Group definitions
    if (/\b(carton|box|kraft|liner|paper|poly|packaging)\b/i.test(n) || /\bpackaging\b/i.test(c)) {
      if (/\b(sticker|label|barcode|ribbon)\b/i.test(n)) return 'STICKER';
      if (/\bmanual\b/i.test(n)) return 'MANUAL';
      return 'CARTON';
    }

    if (/\b(pcba?|mother\s*board|main\s*board|control\s*board|display\s*board|driver\s*board|inverter\s*board|power\s*board|filter\s*board|terminal\s*block|connector)\b/i.test(n)) {
      if (/\bconnector\b/i.test(n)) return 'CONNECTOR';
      return 'PCB';
    }

    if (/\b(stepper\s*motor)\b/i.test(n)) return 'STEPPER MOTOR';
    if (/\b(motor|bldc|fan\s*motor)\b/i.test(n)) return 'Motor';
    if (/\b(fan|blower|propeller)\b/i.test(n)) return 'FAN';

    if (/\b(sensor|thermistor|ambient\s*temp|temp\s*sensor|temperature\s*sensor|coil\s*sensor|probe)\b/i.test(n)) {
      return 'Sensor';
    }

    if (/\b(compressor)\b/i.test(n)) return 'COMPRESSOR';

    if (/\b(service\s*cable)\b/i.test(n)) return 'Service Cable';
    if (/\b(power\s*cable|power\s*cord)\b/i.test(n)) return 'Power Cable';
    if (/\b(cable|wire\s*harness|lead\s*wire)\b/i.test(n) && !/\b(gi\s*wire|stitching\s*wire|flat\s*wire)\b/i.test(n)) {
      return 'CABLE';
    }

    if (/\b(sticker|label|barcode|ribbon)\b/i.test(n)) return 'STICKER';
    if (/\b(manual|warranty)\b/i.test(n)) return 'MANUAL';
    if (/\b(remote)\b/i.test(n)) return 'REMOTE';

    if (/\b(evaporator|evap|cooling\s*coil)\b/i.test(n)) return 'EVAPORATOR';
    if (/\b(condenser|condensor|outdoor\s*coil|microchannel)\b/i.test(n)) return 'CONDENSER';

    if (/\b(service\s*pipe)\b/i.test(n)) return 'Service Pipe';
    if (/\b(copper\s*tube|copper\s*pipe)\b/i.test(n)) return 'COPPER TUBE';
    if (/\b(capillary)\b/i.test(n)) return 'CAPILLARY TUBE';
    if (/\b(insulation\s*pipe|rubber\s*insulation)\b/i.test(n)) return 'INSULATION PIPE';

    if (/\b(service\s*valve|expansion\s*valve|4-way\s*valve|valve)\b/i.test(n)) return 'SERVICE VALVE';

    if (/\b(idu\s*base|indoor\s*base)\b/i.test(n)) return 'IDU BASE';
    if (/\b(odu\s*base|outdoor\s*base|base\s*pan|chassis)\b/i.test(n)) return 'ODU BASE';

    if (/\b(top\s*panel|top\s*cover)\b/i.test(n)) return 'Top Panel';
    if (/\b(front\s*panel|front\s*cover)\b/i.test(n)) return 'Front Panel';
    if (/\b(side\s*cover|side\s*panel)\b/i.test(n)) return 'Side Cover';
    if (/\b(back\s*net)\b/i.test(n)) return 'Back Net';
    if (/\b(front\s*net)\b/i.test(n)) return 'Front Net';
    if (/\b(display)\b/i.test(n)) return 'Display';
    if (/\b(louver|vertical\s*vane|vane)\b/i.test(n)) return 'Louver';

    if (/\b(screw|bolt|nut|washer|m\d+[\.-]\d+|self\s*tapping)\b/i.test(n)) return 'SCREW';
    if (/\b(sheet\s*metal|aluzinc|galvanized)\b/i.test(n)) return 'SHEET METAL';
    if (/\b(capacitor)\b/i.test(n)) return 'CAPACITOR';

    if (/\b(paint)\b/i.test(n)) return 'PAINT';
    if (/\b(ink)\b/i.test(n)) return 'INK';
    if (/\b(resin|solvent|thinner|chemical|glue|borax|sohaga|caustic|anti-fungus)\b/i.test(n) || /\bchemical\b/i.test(c)) {
      return 'CHEMICAL';
    }

    return 'Other';
  }

  function getGroupBadge(groupKey) {
    if (!groupKey) groupKey = 'Other';
    const conf = RM_GROUP_CONFIG[groupKey] || {
      label: groupKey,
      icon: '🧩',
      bg: '#f8fafc',
      color: '#334155',
      border: '#cbd5e1'
    };
    const icon = conf.icon || '🧩';
    const label = conf.label || groupKey;
    return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; background: ${conf.bg}; color: ${conf.color}; border: 1px solid ${conf.border}; white-space: nowrap;">${icon} ${escapeHtml(label)}</span>`;
  }

  // -------------------------------------------------------------
  // BOM Deviation Core Analysis Engine
  // -------------------------------------------------------------
  async function runBOMDeviationAnalysis() {
    const beforeCode = (devBeforeItemCode.value || '').trim();
    const beforeVer = (devBeforeVersion.value || '').trim();
    const afterCode = (devAfterItemCode.value || '').trim();
    const afterVer = (devAfterVersion.value || '').trim();

    if (!beforeCode || !afterCode) {
      alert('Please enter both Before and After Item Codes.');
      return;
    }

    const originalBtnText = btnActionCompare ? btnActionCompare.innerHTML : '';
    if (btnActionCompare) {
      btnActionCompare.disabled = true;
      btnActionCompare.innerHTML = `<span>⏳</span> Comparing...`;
    }

    try {
      const [beforeBom, afterBom] = await Promise.all([
        getOrFetchBom(beforeCode, beforeVer),
        getOrFetchBom(afterCode, afterVer)
      ]);

      if (!beforeBom || !beforeBom.Components || beforeBom.Components.length === 0) {
        alert(`⚠️ Before BOM for Item #${beforeCode} (${beforeVer || 'Standard'}) could not be loaded.\n\nPlease verify this item in Walton EBS.`);
        return;
      }

      if (!afterBom || !afterBom.Components || afterBom.Components.length === 0) {
        alert(`⚠️ After BOM for Item #${afterCode} (${afterVer || 'Standard'}) could not be loaded.\n\nPlease verify this item in Walton EBS.`);
        return;
      }

      if (beforeStatusBadge) {
        beforeStatusBadge.textContent = `🟢 Ready (${beforeBom.Components.length} RMs)`;
        beforeStatusBadge.style.background = '#10b981';
      }
      if (afterStatusBadge) {
        afterStatusBadge.textContent = `🟢 Ready (${afterBom.Components.length} RMs)`;
        afterStatusBadge.style.background = '#10b981';
      }

    // Map components by RM Code
    const beforeMap = new Map();
    beforeBom.Components.forEach(c => {
      beforeMap.set(String(c.RmCode).trim(), c);
    });

    const afterMap = new Map();
    afterBom.Components.forEach(c => {
      afterMap.set(String(c.RmCode).trim(), c);
    });

    const allRmCodes = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    const deviations = [];

    let totalBeforeCost = 0;
    let totalAfterCost = 0;
    let addedCount = 0;
    let removedCount = 0;
    let changedCount = 0;
    let sameCount = 0;

    allRmCodes.forEach(rmCode => {
      const b = beforeMap.get(rmCode);
      const a = afterMap.get(rmCode);

      const bQty = b ? (parseFloat(b.Qty) || 0) : 0;
      const aQty = a ? (parseFloat(a.Qty) || 0) : 0;
      const bPrice = b ? (parseFloat(b.Price) || 0) : 0;
      const aPrice = a ? (parseFloat(a.Price) || 0) : 0;
      const price = aPrice || bPrice;

      const bVal = b ? (parseFloat(b.Value) || (bQty * bPrice)) : 0;
      const aVal = a ? (parseFloat(a.Value) || (aQty * aPrice)) : 0;

      totalBeforeCost += bVal;
      totalAfterCost += aVal;

      const deltaQty = aQty - bQty;
      const costImpact = aVal - bVal;

      let type = 'SAME';
      if (!b && a) {
        type = 'ADDED';
        addedCount++;
      } else if (b && !a) {
        type = 'REMOVED';
        removedCount++;
      } else if (Math.abs(deltaQty) > 0.00001) {
        type = 'CHANGED';
        changedCount++;
      } else {
        type = 'SAME';
        sameCount++;
      }

      const itemRmName = (a && a.RmName) || (b && b.RmName) || '';
      const itemMajorCat = (a && a.MajorCategory) || (b && b.MajorCategory) || '';
      const rmGroup = classifyRmComponent(itemRmName, rmCode, itemMajorCat);

      deviations.push({
        type,
        rmGroup,
        rmCode,
        rmName: itemRmName,
        majorCategory: itemMajorCat,
        minorCategory: (a && a.MinorCategory) || (b && b.MinorCategory) || '',
        uom: (a && a.UOM) || (b && b.UOM) || '',
        beforeQty: b ? bQty : null,
        afterQty: a ? aQty : null,
        deltaQty,
        price,
        costImpact
      });
    });

    // Sort order: ADDED -> REMOVED -> CHANGED -> SAME, then by abs(costImpact) descending
    const typeOrder = { 'ADDED': 1, 'REMOVED': 2, 'CHANGED': 3, 'SAME': 4 };
    deviations.sort((x, y) => {
      if (typeOrder[x.type] !== typeOrder[y.type]) {
        return typeOrder[x.type] - typeOrder[y.type];
      }
      return Math.abs(y.costImpact) - Math.abs(x.costImpact);
    });

    const costDiff = totalAfterCost - totalBeforeCost;
    const diffPct = totalBeforeCost > 0 ? ((costDiff / totalBeforeCost) * 100) : 0;

    currentDeviationData = {
      beforeCode,
      beforeVer,
      afterCode,
      afterVer,
      beforeBom,
      afterBom,
      deviations,
      totalBeforeCost,
      totalAfterCost,
      costDiff,
      diffPct,
      counts: {
        added: addedCount,
        removed: removedCount,
        changed: changedCount,
        same: sameCount,
        diff: addedCount + removedCount + changedCount,
        total: deviations.length
      }
    };

    // Update KPI Ribbon
    if (kpiBeforeCost) kpiBeforeCost.textContent = `৳${formatNum(totalBeforeCost, 2)}`;
    if (kpiBeforeCount) kpiBeforeCount.textContent = `${beforeMap.size} components`;

    if (kpiAfterCost) kpiAfterCost.textContent = `৳${formatNum(totalAfterCost, 2)}`;
    if (kpiAfterCount) kpiAfterCount.textContent = `${afterMap.size} components`;

    const diffSign = costDiff > 0 ? '+' : '';
    if (kpiCostDiff) kpiCostDiff.textContent = `${diffSign}৳${formatNum(costDiff, 2)}`;
    if (kpiCostDiffPct) kpiCostDiffPct.textContent = `${diffSign}${diffPct.toFixed(2)}% variance`;

    if (kpiCostDiffCard && kpiCostDiff) {
      if (costDiff > 0.01) {
        kpiCostDiffCard.style.borderLeft = '4px solid #ef4444';
        kpiCostDiff.style.color = '#b91c1c';
      } else if (costDiff < -0.01) {
        kpiCostDiffCard.style.borderLeft = '4px solid #10b981';
        kpiCostDiff.style.color = '#047857';
      } else {
        kpiCostDiffCard.style.borderLeft = '4px solid #64748b';
        kpiCostDiff.style.color = '#0f172a';
      }
    }

    if (kpiAddedCount) kpiAddedCount.textContent = addedCount;
    if (kpiRemovedCount) kpiRemovedCount.textContent = removedCount;
    if (kpiChangedCount) kpiChangedCount.textContent = changedCount;

    // Slicer Count Badges
    if (countFilterDiff) countFilterDiff.textContent = currentDeviationData.counts.diff;
    if (countFilterAdded) countFilterAdded.textContent = addedCount;
    if (countFilterRemoved) countFilterRemoved.textContent = removedCount;
    if (countFilterChanged) countFilterChanged.textContent = changedCount;
    if (countFilterSame) countFilterSame.textContent = sameCount;
    if (countFilterAll) countFilterAll.textContent = deviations.length;

    // Populate Category Slicer
    if (slicerCategory) {
      const categories = [...new Set(deviations.map(d => d.majorCategory).filter(Boolean))].sort();
      slicerCategory.innerHTML = `<option value="ALL">All Categories (${deviations.length})</option>`;
      categories.forEach(cat => {
        const count = deviations.filter(d => d.majorCategory === cat).length;
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = `${cat} (${count})`;
        slicerCategory.appendChild(opt);
      });
      slicerCategory.value = currentCategoryFilter;
    }

    // Populate RM Group Slicer (PCB, Motor, Sensor, Cable, etc.)
    if (slicerRmGroup) {
      const distinctGroups = [...new Set(deviations.map(d => d.rmGroup))];
      distinctGroups.sort((a, b) => {
        const orderA = (RM_GROUP_CONFIG[a] && RM_GROUP_CONFIG[a].order) || 99;
        const orderB = (RM_GROUP_CONFIG[b] && RM_GROUP_CONFIG[b].order) || 99;
        return orderA - orderB;
      });

      slicerRmGroup.innerHTML = `<option value="ALL">All RM Groups (${deviations.length})</option>`;
      distinctGroups.forEach(grp => {
        const count = deviations.filter(d => d.rmGroup === grp).length;
        const conf = RM_GROUP_CONFIG[grp] || RM_GROUP_CONFIG['Other'];
        const opt = document.createElement('option');
        opt.value = grp;
        opt.textContent = `${conf.icon} ${conf.label} (${count})`;
        slicerRmGroup.appendChild(opt);
      });
      slicerRmGroup.value = currentRmGroupFilter;
    }

    // Show Results Section
    if (deviationResultsSection) {
      deviationResultsSection.style.display = 'block';
    }

    renderDeviationTable();
    } finally {
      if (btnActionCompare) {
        btnActionCompare.disabled = false;
        btnActionCompare.innerHTML = originalBtnText;
      }
    }
  }

  // -------------------------------------------------------------
  // Deviation Table Rendering (With Slicers, RM Name Search & Green Marking)
  // -------------------------------------------------------------
  function highlightMatchText(text, query) {
    if (!text) return '-';
    if (!query) return escapeHtml(String(text));
    const str = String(text);
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return escapeHtml(str).replace(regex, '<mark style="background: #fef08a; color: #854d0e; padding: 1px 4px; border-radius: 3px; font-weight: 700;">$1</mark>');
  }

  function renderDeviationTable() {
    if (!currentDeviationData || !deviationTableBody) return;
    deviationTableBody.innerHTML = '';

    const rawSearch = (filterRmNameDesc ? filterRmNameDesc.value : '') || 
                      (devTableSearch ? devTableSearch.value : '');
    const searchQuery = rawSearch.trim().toLowerCase();

    if (btnClearRmNameFilter) {
      btnClearRmNameFilter.style.display = rawSearch ? 'block' : 'none';
    }

    let list = currentDeviationData.deviations;

    // 1. Filter by Change Type Slicer
    if (currentDevFilter === 'DIFF') {
      list = list.filter(d => d.type !== 'SAME');
    } else if (currentDevFilter !== 'ALL') {
      list = list.filter(d => d.type === currentDevFilter);
    }

    // 2. Filter by Category Slicer
    if (currentCategoryFilter !== 'ALL') {
      list = list.filter(d => d.majorCategory === currentCategoryFilter);
    }

    // 3. Filter by Cost Impact Slicer
    if (currentCostFilter === 'INCREASE') {
      list = list.filter(d => d.costImpact > 0.01);
    } else if (currentCostFilter === 'SAVINGS') {
      list = list.filter(d => d.costImpact < -0.01);
    } else if (currentCostFilter === 'ZERO') {
      list = list.filter(d => Math.abs(d.costImpact) <= 0.01);
    }

    // 4. Filter by RM Group Slicer
    if (currentRmGroupFilter !== 'ALL') {
      list = list.filter(d => d.rmGroup === currentRmGroupFilter);
    }

    // 5. Filter by RM Name / Description & RM Code Search Query
    if (searchQuery) {
      list = list.filter(d => 
        (d.rmName && d.rmName.toLowerCase().includes(searchQuery)) ||
        (d.rmCode && d.rmCode.toLowerCase().includes(searchQuery)) ||
        (d.majorCategory && d.majorCategory.toLowerCase().includes(searchQuery)) ||
        (d.minorCategory && d.minorCategory.toLowerCase().includes(searchQuery)) ||
        (d.rmGroup && d.rmGroup.toLowerCase().includes(searchQuery))
      );
    }

    if (devMatchCountText) {
      if (searchQuery) {
        devMatchCountText.innerHTML = `Showing <strong style="color: #2563eb;">${list.length}</strong> of ${currentDeviationData.deviations.length} components matching <span style="background: #dbeafe; color: #1e40af; padding: 2px 7px; border-radius: 4px; font-size: 12px; font-weight: 600;">"${escapeHtml(rawSearch)}"</span>`;
      } else {
        devMatchCountText.textContent = `Showing ${list.length} of ${currentDeviationData.deviations.length} components matching active slicers`;
      }
    }

    if (list.length === 0) {
      deviationTableBody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align: center; padding: 36px; color: #64748b; font-size: 13.5px;">
            🔍 No components found matching <strong style="color: #0f172a;">"${escapeHtml(rawSearch || 'selected slicers')}"</strong>.<br>
            <button onclick="document.getElementById('btnClearRmNameFilter') ? document.getElementById('btnClearRmNameFilter').click() : document.getElementById('btnResetSlicers').click()" style="margin-top: 10px; padding: 6px 14px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12.5px;">
              ✕ Clear Search Filter
            </button>
          </td>
        </tr>
      `;
      return;
    }

    function createRow(d) {
      const tr = document.createElement('tr');
      if (d.type === 'ADDED') tr.className = 'diff-added'; // Vivid Green Mark
      else if (d.type === 'REMOVED') tr.className = 'diff-removed';
      else if (d.type === 'CHANGED') tr.className = 'diff-changed';

      // Change Type Badge
      let badgeHtml = '';
      if (d.type === 'ADDED') badgeHtml = '<span class="diff-badge added">🟢 Added</span>';
      else if (d.type === 'REMOVED') badgeHtml = '<span class="diff-badge removed">🔴 Removed</span>';
      else if (d.type === 'CHANGED') badgeHtml = '<span class="diff-badge changed">🟡 Qty Changed</span>';
      else badgeHtml = '<span class="diff-badge same">⚪ Unchanged</span>';

      // Delta Qty formatting
      let deltaQtyHtml = '';
      if (d.type === 'ADDED') {
        deltaQtyHtml = `<span style="color:#059669; font-weight:800; font-size:13px;">+${formatNum(d.afterQty, 4)}</span>`;
      } else if (d.type === 'REMOVED') {
        deltaQtyHtml = `<span style="color:#dc2626; font-weight:800; font-size:13px;">-${formatNum(d.beforeQty, 4)}</span>`;
      } else if (d.type === 'CHANGED') {
        const sign = d.deltaQty > 0 ? '+' : '';
        const color = d.deltaQty > 0 ? '#b45309' : '#0284c7';
        deltaQtyHtml = `<span style="color:${color}; font-weight:700;">${sign}${formatNum(d.deltaQty, 4)}</span>`;
      } else {
        deltaQtyHtml = '<span style="color:#94a3b8;">0</span>';
      }

      // Cost Impact formatting
      let costImpactHtml = '';
      if (d.costImpact > 0.005) {
        costImpactHtml = `<span style="color:#b91c1c; font-weight:700;">+৳${formatNum(d.costImpact, 2)}</span>`;
      } else if (d.costImpact < -0.005) {
        costImpactHtml = `<span style="color:#047857; font-weight:700;">-৳${formatNum(Math.abs(d.costImpact), 2)}</span>`;
      } else {
        costImpactHtml = '<span style="color:#94a3b8;">৳0.00</span>';
      }

      tr.innerHTML = `
        <td class="center-cell" style="padding: 9px 10px;">${badgeHtml}</td>
        <td style="padding: 9px 10px;">${getGroupBadge(d.rmGroup)}</td>
        <td style="padding: 9px 10px;"><strong style="color: #0284c7;">${highlightMatchText(d.rmCode, searchQuery)}</strong></td>
        <td style="padding: 9px 10px; font-weight: 500;">${highlightMatchText(d.rmName, searchQuery)}</td>
        <td style="padding: 9px 10px;"><span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${highlightMatchText(d.majorCategory || '-', searchQuery)}</span></td>
        <td class="center-cell" style="padding: 9px 10px;">${d.uom}</td>
        <td class="num-cell" style="color: #b45309; padding: 9px 10px; font-weight: ${d.beforeQty ? '600' : 'normal'};">${d.beforeQty !== null ? formatNum(d.beforeQty, 4) : '-'}</td>
        <td class="num-cell" style="color: #047857; padding: 9px 10px; font-weight: ${d.afterQty ? '600' : 'normal'};">${d.afterQty !== null ? formatNum(d.afterQty, 4) : '-'}</td>
        <td class="num-cell" style="padding: 9px 10px;">${deltaQtyHtml}</td>
        <td class="num-cell" style="color: #64748b; padding: 9px 10px;">৳${formatNum(d.price, 2)}</td>
        <td class="num-cell" style="padding: 9px 10px;">${costImpactHtml}</td>
      `;
      return tr;
    }

    if (isGroupedView) {
      // Group items by rmGroup
      const groupsMap = new Map();
      list.forEach(d => {
        const g = d.rmGroup || 'Other';
        if (!groupsMap.has(g)) groupsMap.set(g, []);
        groupsMap.get(g).push(d);
      });

      const sortedGroupKeys = Array.from(groupsMap.keys()).sort((a, b) => {
        const orderA = (RM_GROUP_CONFIG[a] && RM_GROUP_CONFIG[a].order) || 99;
        const orderB = (RM_GROUP_CONFIG[b] && RM_GROUP_CONFIG[b].order) || 99;
        return orderA - orderB;
      });

      sortedGroupKeys.forEach(grpKey => {
        const items = groupsMap.get(grpKey);
        const conf = RM_GROUP_CONFIG[grpKey] || RM_GROUP_CONFIG['Other'];
        const groupCostImpact = items.reduce((sum, it) => sum + (it.costImpact || 0), 0);
        const impactSign = groupCostImpact > 0.005 ? '+' : '';
        const impactColor = groupCostImpact > 0.005 ? '#b91c1c' : (groupCostImpact < -0.005 ? '#047857' : '#64748b');

        const headerTr = document.createElement('tr');
        headerTr.className = 'group-header-row';
        headerTr.innerHTML = `
          <td colspan="11" style="background: ${conf.bg}; border-left: 6px solid ${conf.color}; padding: 10px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <span style="font-size: 13.5px; font-weight: 800; color: ${conf.color}; display: inline-flex; align-items: center; gap: 6px;">
                ${conf.icon} ${conf.label} Subsystem
                <span style="font-size: 11.5px; font-weight: 700; background: #ffffff; color: ${conf.color}; padding: 2px 9px; border-radius: 12px; border: 1px solid ${conf.border}; margin-left: 6px;">
                  ${items.length} ${items.length === 1 ? 'component' : 'components'}
                </span>
              </span>
              <span style="font-size: 12.5px; font-weight: 700; color: ${impactColor};">
                Subsystem Cost Impact: ${impactSign}৳${formatNum(groupCostImpact, 2)}
              </span>
            </div>
          </td>
        `;
        deviationTableBody.appendChild(headerTr);

        items.forEach(d => {
          deviationTableBody.appendChild(createRow(d));
        });
      });
    } else {
      list.forEach(d => {
        deviationTableBody.appendChild(createRow(d));
      });
    }
  }

  // -------------------------------------------------------------
  // Single Explorer Logic (Optional Secondary View)
  // -------------------------------------------------------------
  function updateVersionDropdown() {
    if (!searchVersion) return;
    const codeQuery = (searchItemCode.value || '').trim().toLowerCase();
    const currentSelectedVer = searchVersion.value;

    searchVersion.innerHTML = '';

    if (!codeQuery) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-- All Versions --';
      searchVersion.appendChild(opt);
      return;
    }

    const matchingItems = allItems.filter(item => {
      const c = (item.ItemCode || '').toLowerCase();
      return c === codeQuery || c.startsWith(codeQuery);
    });

    const versions = [];
    matchingItems.forEach(item => {
      const ver = (item.Version || 'Standard').trim();
      if (!versions.some(v => v.name.toLowerCase() === ver.toLowerCase())) {
        versions.push({
          name: ver,
          item: item,
          cached: isItemCached(item)
        });
      }
    });

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = versions.length > 0 ? `-- Select Version (${versions.length} available) --` : '-- No Versions Found --';
    searchVersion.appendChild(defaultOpt);

    versions.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} ${v.cached ? '⚡' : '🌐'} (৳${formatNum(v.item.RMCost)})`;
      searchVersion.appendChild(opt);
    });

    // Retain previous selection if valid
    if (currentSelectedVer && versions.some(v => v.name.toLowerCase() === currentSelectedVer.toLowerCase())) {
      searchVersion.value = currentSelectedVer;
    }
  }

  function applyFilters(triggeredByVersionChange = false) {
    if (!searchItemCode || !searchVersion) return;
    const codeQuery = (searchItemCode.value || '').trim().toLowerCase();
    const verQuery = (searchVersion.value || '').trim().toLowerCase();
    const org = filterOrg ? filterOrg.value : 'ALL';
    const cacheOnly = filterCache ? filterCache.value === 'CACHED' : false;

    filteredItems = allItems.filter(item => {
      if (org !== 'ALL' && item.Org !== org) return false;
      if (cacheOnly && !isItemCached(item)) return false;

      if (codeQuery) {
        const itemCodeStr = (item.ItemCode || '').toLowerCase();
        const itemNameStr = (item.ItemName || '').toLowerCase();
        if (!itemCodeStr.includes(codeQuery) && !itemNameStr.includes(codeQuery)) return false;
      }

      if (verQuery) {
        const itemVerStr = (item.Version || 'Standard').toLowerCase();
        if (itemVerStr !== verQuery && !itemVerStr.includes(verQuery)) return false;
      }

      return true;
    });

    currentPage = 1;
    if (resultsCountText) {
      resultsCountText.textContent = `Showing ${filteredItems.length.toLocaleString()} of ${allItems.length.toLocaleString()} models`;
    }
    if (btnClearItemCode) btnClearItemCode.style.display = codeQuery ? 'block' : 'none';

    renderCatalogList();

    // Auto-open BOM if single match or user selected a version
    if (filteredItems.length === 1 && (codeQuery.length >= 4 || verQuery || triggeredByVersionChange)) {
      selectItem(filteredItems[0]);
    }
  }

  function renderCatalogList() {
    if (!catalogListContainer) return;
    catalogListContainer.innerHTML = '';

    const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    if (pageSummary) pageSummary.textContent = `${currentPage} / ${totalPages}`;
    if (btnPrevPage) btnPrevPage.disabled = currentPage <= 1;
    if (btnNextPage) btnNextPage.disabled = currentPage >= totalPages;

    const startIdx = (currentPage - 1) * pageSize;
    const pageItems = filteredItems.slice(startIdx, startIdx + pageSize);

    if (pageItems.length === 0) {
      catalogListContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 13px;">No matching models found.</div>`;
      return;
    }

    pageItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'catalog-item-card';
      if (selectedItem && selectedItem.ItemCode === item.ItemCode && selectedItem.Version === item.Version) {
        card.classList.add('active');
      }

      const cached = isItemCached(item);

      card.innerHTML = `
        <div class="card-top">
          <span class="item-code-badge">#${item.ItemCode}</span>
          <span class="org-pill ${(item.Org || '').toLowerCase()}">${item.Org || '-'}</span>
        </div>
        <div class="card-name" title="${escapeHtml(item.ItemName)}">${escapeHtml(item.ItemName)}</div>
        <div class="card-bottom">
          <span class="version-tag">${escapeHtml(item.Version || 'Standard')}</span>
          <div>
            ${cached ? '<span class="cached-indicator">⚡ Ready</span>' : ''}
            <span class="rm-cost-text" style="margin-left: 6px;">৳${formatNum(item.RMCost)}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => selectItem(item));
      catalogListContainer.appendChild(card);
    });
  }

  async function selectItem(item) {
    selectedItem = item;
    document.querySelectorAll('.catalog-item-card').forEach(c => c.classList.remove('active'));
    renderCatalogList();

    if (emptyState) emptyState.style.display = 'none';
    if (selectedModelView) selectedModelView.style.display = 'block';

    if (mItemName) mItemName.textContent = item.ItemName || 'Unnamed Model';
    if (mItemCode) mItemCode.textContent = item.ItemCode || '-';
    if (mVersion) mVersion.textContent = item.Version || 'Standard';
    if (mOrg) mOrg.textContent = item.Org || '-';
    if (mUOM) mUOM.textContent = item.UOM || 'PCS';
    if (mRMCost) mRMCost.textContent = formatNum(item.RMCost);

    if (searchVersion && item.Version) {
      const hasOpt = Array.from(searchVersion.options).some(o => o.value.toLowerCase() === (item.Version || '').toLowerCase());
      if (hasOpt) searchVersion.value = item.Version;
    }

    const cleanUrl = (item.RmUrl || '').replace(/[\r\n\t]+/g, '').trim();
    if (btnLiveEbs) btnLiveEbs.href = `https://webs.waltonbd.com/1225/${cleanUrl}`;

    if (inputVerifyRmCode) inputVerifyRmCode.value = '';
    if (inputPhysicalQty) inputPhysicalQty.value = '';
    if (verifyResultCard) verifyResultCard.style.display = 'none';
    if (bomTableSearch) bomTableSearch.value = '';

    if (mTotalRM) mTotalRM.textContent = '⏳ Loading...';
    if (bomTableBody) {
      bomTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:#64748b;">⏳ Loading BOM components...</td></tr>`;
    }

    const cached = await getOrFetchBom(item.ItemCode, item.Version);
    if (cached && cached.Components && cached.Components.length > 0) {
      currentBomData = cached;
      if (notLoadedNotice) notLoadedNotice.style.display = 'none';
      if (mTotalRM) mTotalRM.textContent = `${cached.Components.length} Raw Materials`;
      activeTableComponents = [...cached.Components];
      renderBomTable();

      // If user had already generated a report for this model or typed text, auto-sync
      if (currentFloorObsData && currentFloorObsData.itemCode === item.ItemCode) {
        generateFloorDeviationReport();
      }
    } else {
      currentBomData = null;
      if (notLoadedNotice) notLoadedNotice.style.display = 'block';
      if (cmdCode) cmdCode.textContent = item.ItemCode;
      if (cmdVer) cmdVer.textContent = item.Version || '';
      if (mTotalRM) mTotalRM.textContent = 'Not Cached';
      activeTableComponents = [];
      if (bomTableBody) {
        bomTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:#64748b;">Detailed BOM components available on Walton EBS.</td></tr>`;
      }
      if (componentCountBadge) componentCountBadge.textContent = '0 components';
      if (floorDeviationReportSection) floorDeviationReportSection.style.display = 'none';
    }
  }

  function renderBomTable(filterQuery = '') {
    if (!bomTableBody) return;
    bomTableBody.innerHTML = '';
    const q = (filterQuery || '').trim().toLowerCase();

    let list = activeTableComponents;
    if (q) {
      list = list.filter(c => {
        const grp = classifyRmComponent(c.RmName, c.RmCode, c.MajorCategory);
        return (c.RmCode && c.RmCode.toLowerCase().includes(q)) ||
          (c.RmName && c.RmName.toLowerCase().includes(q)) ||
          (c.MajorCategory && c.MajorCategory.toLowerCase().includes(q)) ||
          (c.MinorCategory && c.MinorCategory.toLowerCase().includes(q)) ||
          (grp && grp.toLowerCase().includes(q));
      });
    }

    if (componentCountBadge) {
      componentCountBadge.textContent = `${list.length} of ${activeTableComponents.length} components`;
    }

    list.forEach(c => {
      const grp = classifyRmComponent(c.RmName, c.RmCode, c.MajorCategory);
      const audit = floorAuditedMap.get(String(c.RmCode).trim());

      let auditBadgeHtml = '';
      let rowClass = '';
      if (audit) {
        if (audit.status === 'EXCESS') {
          rowClass = 'floor-row-excess';
          auditBadgeHtml = `<span class="bom-audited-badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;" title="Floor Obs: ${audit.physicalQty} | Excess: +${audit.deltaQty.toFixed(4)}">🔴 Floor: ${formatNum(audit.physicalQty, 4)} (+${formatNum(audit.deltaQty, 4)})</span>`;
        } else if (audit.status === 'SAVINGS') {
          rowClass = 'floor-row-savings';
          auditBadgeHtml = `<span class="bom-audited-badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac;" title="Floor Obs: ${audit.physicalQty} | Savings: ${audit.deltaQty.toFixed(4)}">🟢 Floor: ${formatNum(audit.physicalQty, 4)} (${formatNum(audit.deltaQty, 4)})</span>`;
        } else if (audit.status === 'MATCH') {
          rowClass = 'floor-row-match';
          auditBadgeHtml = `<span class="bom-audited-badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;" title="Floor Obs: Exact match">⚪ Floor: ${formatNum(audit.physicalQty, 4)} (=)</span>`;
        }
      }

      const tr = document.createElement('tr');
      if (rowClass) tr.className = rowClass;
      tr.setAttribute('data-rmcode', c.RmCode);
      tr.innerHTML = `
        <td class="center-cell">${c.SL}</td>
        <td>${getGroupBadge(grp)}</td>
        <td><span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${escapeHtml(c.MajorCategory || '-')}</span></td>
        <td><span style="color: #64748b; font-size: 11.5px;">${escapeHtml(c.MinorCategory || '-')}</span></td>
        <td><strong style="color: #0284c7; cursor: pointer;" onclick="document.getElementById('inputVerifyRmCode').value='${c.RmCode}'; document.getElementById('btnRunVerification').click();">${c.RmCode}</strong></td>
        <td>${escapeHtml(c.RmName)} ${auditBadgeHtml}</td>
        <td class="center-cell">${c.UOM}</td>
        <td class="num-cell" style="font-weight: 700;">${formatNum(c.Qty, 4)}</td>
        <td class="num-cell" style="color: #64748b;">৳${formatNum(c.Price, 2)}</td>
        <td class="num-cell" style="font-weight: 600;">৳${formatNum(c.Value, 2)}</td>
      `;
      bomTableBody.appendChild(tr);
    });
  }

  function runCrossVerification() {
    const rawRmCode = (inputVerifyRmCode.value || '').trim();
    if (!rawRmCode) {
      alert('Please enter an RM Code to verify.');
      return;
    }

    document.querySelectorAll('#bomTableBody tr').forEach(r => r.classList.remove('highlight-found'));

    if (!currentBomData || !currentBomData.Components) {
      verifyResultCard.className = 'verify-result-card warning';
      verifyResultCard.style.display = 'block';
      verifyResultCard.innerHTML = `⚠️ Detailed BOM not cached offline.`;
      return;
    }

    const matched = currentBomData.Components.find(c => String(c.RmCode).trim() === rawRmCode);
    const physicalQtyVal = parseFloat(inputPhysicalQty.value);
    const hasPhysicalQty = !isNaN(physicalQtyVal);

    if (matched) {
      const row = document.querySelector(`#bomTableBody tr[data-rmcode="${matched.RmCode}"]`);
      if (row) {
        row.classList.add('highlight-found');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      let varianceHtml = '';
      if (hasPhysicalQty) {
        const diff = physicalQtyVal - parseFloat(matched.Qty);
        varianceHtml = `<div style="margin-top:6px;">Physical: <strong>${physicalQtyVal}</strong> | BOM: <strong>${matched.Qty}</strong> (${matched.UOM}) &rarr; <strong>Diff: ${diff.toFixed(4)}</strong></div>`;
      }

      verifyResultCard.className = 'verify-result-card success';
      verifyResultCard.style.display = 'block';
      verifyResultCard.innerHTML = `
        <strong>✅ MATCH FOUND: [RM: ${matched.RmCode}]</strong><br>
        ${escapeHtml(matched.RmName)} | Standard Qty: ${formatNum(matched.Qty, 4)} ${matched.UOM}
        ${varianceHtml}
      `;
    } else {
      verifyResultCard.className = 'verify-result-card danger';
      verifyResultCard.style.display = 'block';
      verifyResultCard.innerHTML = `<strong>❌ NOT IN ACTIVE BOM!</strong> RM Code #${escapeHtml(rawRmCode)} does not exist in this model's BOM.`;
    }
  }

  // -------------------------------------------------------------
  // Floor Physical Observation Message Parsing & Report Engine
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Floor Physical Observation Message Parsing & Report Engine
  // -------------------------------------------------------------
  function parseFloorObservationMessage(rawText, bomComponents = []) {
    if (!rawText) return { headerInfo: {}, obsMap: new Map() };
    const lines = rawText.split(/\r?\n/);
    const obsMap = new Map();
    const headerInfo = { fgCode: null, version: null, model: null };

    // Build lookup maps from current BOM if available
    const bomByCode = new Map();
    const bomByName = [];
    if (bomComponents && bomComponents.length > 0) {
      bomComponents.forEach(c => {
        const codeKey = String(c.RmCode).trim();
        bomByCode.set(codeKey, c);
        if (c.RmName) {
          bomByName.push({
            code: codeKey,
            name: c.RmName.toLowerCase(),
            component: c
          });
        }
      });
    }

    lines.forEach(line => {
      let rawLine = line.trim();
      if (!rawLine) return;

      // Detect Header Info (e.g. FG Code : 486948, Outdoor version : 2326, Model : ...)
      const fgMatch = rawLine.match(/\bfg\s*(?:code|item\s*code)?\s*[:=]\s*([0-9]{5,10})/i);
      if (fgMatch) headerInfo.fgCode = fgMatch[1].trim();

      const verMatch = rawLine.match(/(?:outdoor\s*version|bom\s*version|version)\s*[:=]\s*([A-Za-z0-9_-]+)/i);
      if (verMatch) headerInfo.version = verMatch[1].trim();

      const modelMatch = rawLine.match(/model\s*[:=]\s*([A-Za-z0-9_-]+)/i);
      if (modelMatch) headerInfo.model = modelMatch[1].trim();

      // Skip lines that are purely header titles
      if (/^(physical\s*qty|model\s*:|outdoor\s*version|fg\s*code)/i.test(rawLine) && !rawLine.includes('item code') && !rawLine.includes('physically')) {
        return;
      }

      let code = null;
      let qty = null;
      let note = '';
      let desc = '';

      // Check for tolerance note, e.g. "(6% tolerance added )"
      const tolMatch = rawLine.match(/\(([^)]*tolerance[^)]*)\)/i);
      if (tolMatch) {
        note = tolMatch[1].trim();
      }

      // 1. Detect Item Code if present
      const codeMatch = rawLine.match(/(?:item\s*code|rm\s*code|code)\s*[:=-]?\s*([0-9]{4,10})/i);
      if (codeMatch) {
        code = codeMatch[1].trim();
      } else {
        const standaloneCode = rawLine.match(/(?:^|[\(\[\s])([0-9]{5,8})(?:[\)\]\s:]|$)/);
        if (standaloneCode) {
          code = standaloneCode[1].trim();
        }
      }

      // 2. Determine Physical Quantity
      // Check "physically not use" / "not used" -> Qty = 0
      if (/physically\s*not\s*use[ds]?|not\s*physically\s*use[ds]?|not\s*use[ds]\s*physically/i.test(rawLine)) {
        qty = 0;
        if (!note) note = 'Mentioned in BOM but physically not used';
      }
      // Check "physically use 10 pcs" / "physically used 3.875"
      else if (/physically\s*(?:use|used)\s*([0-9]+(?:\.[0-9]+)?)/i.test(rawLine)) {
        const qm = rawLine.match(/physically\s*(?:use|used)\s*([0-9]+(?:\.[0-9]+)?)/i);
        qty = parseFloat(qm[1]);
      }
      // Check "physical qty: 10"
      else if (/physical\s*(?:qty|quantity|count)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i.test(rawLine)) {
        const qm = rawLine.match(/physical\s*(?:qty|quantity|count)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i);
        qty = parseFloat(qm[1]);
      }
      // Check simple format: "113039 0.08" or "113039: 0.08"
      else if (code) {
        const afterCode = rawLine.substring(rawLine.indexOf(code) + code.length).trim();
        const simpleQtyMatch = afterCode.match(/^[:=\s,\t-]+([0-9]+(?:\.[0-9]+)?)(?:\s*(?:pcs|pc|kg|gm|mtr|m|set|nos))?$/i);
        if (simpleQtyMatch) {
          qty = parseFloat(simpleQtyMatch[1]);
        }
      }

      // 3. Handle lines without item code (e.g. "(9) 12K Earthing Cable is physically use but not mentioned in BOM")
      if (!code) {
        if (/physically\s*use[ds]?/i.test(rawLine)) {
          let cleanedDesc = rawLine
            .replace(/^[\(\[]?\d+[\)\]\.\s]*/, '')
            .replace(/is\s*physically\s*use.*$/i, '')
            .trim();

          if (cleanedDesc) {
            desc = cleanedDesc;
            const matchedByName = bomByName.find(b => b.name.includes(desc.toLowerCase()) || desc.toLowerCase().includes(b.name));
            if (matchedByName) {
              code = matchedByName.code;
              note = `Matched by description: ${desc}`;
            } else {
              code = 'UNLISTED-' + (obsMap.size + 1);
              note = 'Physically used on floor but not mentioned in BOM';
            }
            if (qty === null) qty = 1;
          }
        }
      }

      // 4. Intelligent fuzzy typo correction (e.g. user typed 179714 Cable Tie -> BOM RM is 170714)
      if (code && !bomByCode.has(code) && !code.startsWith('UNLISTED') && bomByName.length > 0) {
        const descMatch = rawLine.match(new RegExp(code + "\\s+([A-Za-z0-9\\s\\-\\.,×x]+?)\\s+(?:is\\s*mentioned|mentioned|physically)", "i"));
        if (descMatch) {
          const potentialName = descMatch[1].trim().toLowerCase();
          if (potentialName.length > 3) {
            const matchedByName = bomByName.find(b => b.name.includes(potentialName) || potentialName.includes(b.name));
            if (matchedByName) {
              const origCode = code;
              code = matchedByName.code;
              note = (note ? note + ' | ' : '') + `Typed Code: ${origCode} -> Auto-resolved to BOM RM #${code}`;
            }
          }
        }
      }

      // 5. Save to obsMap
      if (code && qty !== null) {
        if (obsMap.has(code)) {
          obsMap.get(code).qty += qty;
          if (note) obsMap.get(code).note = (obsMap.get(code).note ? obsMap.get(code).note + '; ' : '') + note;
        } else {
          obsMap.set(code, { rmCode: code, qty, note, desc: desc || '' });
        }
      }
    });

    return { headerInfo, obsMap };
  }

  function updateFloorMsgBadge() {
    if (!floorMsgParsedBadge || !txtFloorObsMsg) return;
    const raw = txtFloorObsMsg.value.trim();
    if (!raw) {
      floorMsgParsedBadge.textContent = '0 codes entered';
      return;
    }
    const comps = currentBomData && currentBomData.Components ? currentBomData.Components : [];
    const { headerInfo, obsMap } = parseFloorObservationMessage(raw, comps);
    if (headerInfo && headerInfo.fgCode) {
      floorMsgParsedBadge.textContent = `FG: ${headerInfo.fgCode} | ${obsMap.size} items`;
    } else {
      floorMsgParsedBadge.textContent = `${obsMap.size} codes parsed`;
    }
  }

  async function loadSampleFloorObservation() {
    const sampleMsg = `Physical Qty Message Box. example.FG Code : 486948
Model : Walton-WSI-WSI12AJB2-DMEX-2326

Outdoor version : 2326

(1) item code : 487164 Walton User Manual is mentioned in BOM but physically not use.

(2) item code : 179714 Cable Tie 150mm is mentioned in BOM 8 pcs but physically use 10 pcs.

(3) item code : 170715 Rubber Mud is mentioned in BOM 2 pcs but physically use 3.875 pcs.

(4) item code : 216762 Green Ink 2250C is mentioned in BOM but physically not use.

(5) item code : 236949 Door Fixing Tape is mentioned in BOM but physically not use.

(6) item code : 282175 Fan Stand Condenser Support is mentioned in BOM but physically not use.

(7) item code : 355457 M4-07×8 Screw is mentioned in BOM 2 pcs but physically use 3 pcs.

(8) item code : 178623 R-32 Refrigerant is mentioned in BOM 0.583 gm but physically use 0.318 kg. (6% tolerance added )

(9) 12K Earthing Cable is physically use but not mentioned in BOM.`;

    if (txtFloorObsMsg) {
      txtFloorObsMsg.value = sampleMsg;
      updateFloorMsgBadge();
    }

    await generateFloorDeviationReport();
  }

  async function generateFloorDeviationReport() {
    const rawMsg = txtFloorObsMsg ? txtFloorObsMsg.value.trim() : '';
    if (!rawMsg) {
      alert("Please paste or type floor physical observations in the message box.\n\nTip: Click '⚡ Sample Msg' to test with instant sample data.");
      return;
    }

    // Step 1: Pre-parse to see if message contains FG Code & Version
    let comps = currentBomData && currentBomData.Components ? currentBomData.Components : [];
    let parsedResult = parseFloorObservationMessage(rawMsg, comps);

    const { headerInfo } = parsedResult;
    if (headerInfo && headerInfo.fgCode) {
      const targetCode = headerInfo.fgCode.trim();
      const currentCode = selectedItem ? String(selectedItem.ItemCode).trim() : '';
      const targetVer = (headerInfo.version || '').trim();
      const currentVer = selectedItem ? String(selectedItem.Version || '').trim() : '';

      if (targetCode !== currentCode || (targetVer && !currentVer.toLowerCase().includes(targetVer.toLowerCase()))) {
        const match = allItems.find(it => 
          String(it.ItemCode).trim() === targetCode && 
          (!targetVer || (it.Version || '').toLowerCase().includes(targetVer.toLowerCase()))
        ) || allItems.find(it => String(it.ItemCode).trim() === targetCode);

        if (match) {
          if (searchItemCode) searchItemCode.value = match.ItemCode;
          updateVersionDropdown();
          if (searchVersion && match.Version) searchVersion.value = match.Version;
          applyFilters();
          await selectItem(match);
          comps = currentBomData && currentBomData.Components ? currentBomData.Components : [];
          parsedResult = parseFloorObservationMessage(rawMsg, comps);
        }
      }
    }

    if (!currentBomData || !currentBomData.Components || currentBomData.Components.length === 0) {
      alert("Please select an FG Item Code and Version to open a BOM first.");
      return;
    }

    const { obsMap } = parsedResult;
    if (obsMap.size === 0) {
      alert("Could not detect any RM Codes and Quantities in the message.\n\nPlease format entries as:\nRM_CODE QTY\nor sentences like:\n(1) item code : 487164 ... physically not use.\n(2) item code : 179714 ... physically use 10 pcs.");
      return;
    }

    floorAuditedMap.clear();
    const bomComponents = currentBomData.Components;
    const bomMap = new Map();
    bomComponents.forEach(c => bomMap.set(String(c.RmCode).trim(), c));

    const rows = [];
    let totalBomCost = 0;
    let totalObsCost = 0;
    let excessCount = 0;
    let savingsCount = 0;
    let matchCount = 0;
    let unlistedCount = 0;

    obsMap.forEach((obs, code) => {
      const matched = bomMap.get(code);
      if (matched) {
        const bomQty = parseFloat(matched.Qty) || 0;
        const physicalQty = obs.qty;
        const deltaQty = physicalQty - bomQty;
        const price = parseFloat(matched.Price) || 0;
        const bomValue = bomQty * price;
        const physicalValue = physicalQty * price;
        const costDeviation = deltaQty * price;

        totalBomCost += bomValue;
        totalObsCost += physicalValue;

        let status = 'MATCH';
        if (deltaQty > 0.000001) {
          status = 'EXCESS';
          excessCount++;
        } else if (deltaQty < -0.000001) {
          status = 'SAVINGS';
          savingsCount++;
        } else {
          matchCount++;
        }

        const rmGroup = classifyRmComponent(matched.RmName, matched.RmCode, matched.MajorCategory);

        const rowItem = {
          status,
          rmGroup,
          rmCode: matched.RmCode,
          rmName: matched.RmName,
          note: obs.note || '',
          majorCategory: matched.MajorCategory,
          minorCategory: matched.MinorCategory,
          uom: matched.UOM,
          bomQty,
          physicalQty,
          deltaQty,
          price,
          costDeviation
        };
        rows.push(rowItem);
        floorAuditedMap.set(code, rowItem);
      } else {
        // Unlisted item in floor observation
        unlistedCount++;
        const rmGroup = classifyRmComponent(obs.desc || '', code, '');
        const rowItem = {
          status: 'UNLISTED',
          rmGroup,
          rmCode: code.startsWith('UNLISTED') ? 'Unlisted' : code,
          rmName: obs.desc || `⚠️ RM #${code} (Not in Active BOM)`,
          note: obs.note || 'Observed on floor but not listed in BOM',
          majorCategory: 'Floor Extra',
          minorCategory: 'Unlisted',
          uom: 'PCS',
          bomQty: 0,
          physicalQty: obs.qty,
          deltaQty: obs.qty,
          price: 0,
          costDeviation: 0
        };
        rows.push(rowItem);
        floorAuditedMap.set(code, rowItem);
      }
    });

    const netCostDeviation = totalObsCost - totalBomCost;
    const diffPct = totalBomCost > 0 ? (netCostDeviation / totalBomCost) * 100 : 0;
    const diffCount = excessCount + savingsCount + unlistedCount;

    currentFloorObsData = {
      itemCode: selectedItem ? selectedItem.ItemCode : '',
      version: selectedItem ? selectedItem.Version : '',
      itemName: selectedItem ? selectedItem.ItemName : '',
      rows,
      counts: {
        all: rows.length,
        diff: diffCount,
        excess: excessCount,
        savings: savingsCount,
        match: matchCount,
        unlisted: unlistedCount
      },
      kpis: {
        totalBomCost,
        totalObsCost,
        netCostDeviation,
        diffPct
      }
    };

    // Update KPI UI
    if (kpiFloorBomCost) kpiFloorBomCost.textContent = `৳${formatNum(totalBomCost, 2)}`;
    if (kpiFloorAuditedCount) kpiFloorAuditedCount.textContent = `${rows.length} items audited`;
    if (kpiFloorObsCost) kpiFloorObsCost.textContent = `৳${formatNum(totalObsCost, 2)}`;

    if (kpiFloorCostDiff) {
      const sign = netCostDeviation > 0.005 ? '+' : (netCostDeviation < -0.005 ? '-' : '');
      kpiFloorCostDiff.textContent = `${sign}৳${formatNum(Math.abs(netCostDeviation), 2)}`;
    }
    if (kpiFloorCostDiffPct) {
      const sign = diffPct > 0.005 ? '+' : (diffPct < -0.005 ? '-' : '');
      kpiFloorCostDiffPct.textContent = `${sign}${formatNum(Math.abs(diffPct), 2)}%`;
    }

    if (kpiFloorCostDiffCard) {
      if (netCostDeviation > 0.01) {
        kpiFloorCostDiffCard.style.background = '#fef2f2';
        kpiFloorCostDiffCard.style.borderColor = '#fca5a5';
        if (kpiFloorCostDiff) kpiFloorCostDiff.style.color = '#dc2626';
        if (kpiFloorCostDiffPct) kpiFloorCostDiffPct.style.color = '#b91c1c';
      } else if (netCostDeviation < -0.01) {
        kpiFloorCostDiffCard.style.background = '#ecfdf5';
        kpiFloorCostDiffCard.style.borderColor = '#86efac';
        if (kpiFloorCostDiff) kpiFloorCostDiff.style.color = '#15803d';
        if (kpiFloorCostDiffPct) kpiFloorCostDiffPct.style.color = '#166534';
      } else {
        kpiFloorCostDiffCard.style.background = '#f8fafc';
        kpiFloorCostDiffCard.style.borderColor = '#cbd5e1';
        if (kpiFloorCostDiff) kpiFloorCostDiff.style.color = '#475569';
        if (kpiFloorCostDiffPct) kpiFloorCostDiffPct.style.color = '#64748b';
      }
    }

    if (kpiFloorExcessCount) kpiFloorExcessCount.textContent = excessCount;
    if (kpiFloorSavingsCount) kpiFloorSavingsCount.textContent = savingsCount;
    if (kpiFloorMatchCount) kpiFloorMatchCount.textContent = matchCount;
    if (kpiFloorUnlistedCount) kpiFloorUnlistedCount.textContent = unlistedCount;

    if (countFloorAll) countFloorAll.textContent = rows.length;
    if (countFloorDiff) countFloorDiff.textContent = diffCount;
    if (countFloorExcess) countFloorExcess.textContent = excessCount;
    if (countFloorSavings) countFloorSavings.textContent = savingsCount;
    if (countFloorMatch) countFloorMatch.textContent = matchCount;
    if (countFloorUnlisted) countFloorUnlisted.textContent = unlistedCount;

    if (floorReportSubtitle && selectedItem) {
      floorReportSubtitle.textContent = `Audited ${rows.length} floor observations against #${selectedItem.ItemCode} (${selectedItem.Version || 'Standard'}) - ${selectedItem.ItemName || ''}`;
    }

    if (floorDeviationReportSection) {
      floorDeviationReportSection.style.display = 'block';
      floorDeviationReportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    currentFloorFilter = 'ALL';
    const slicerPills = document.querySelectorAll('#floorReportSlicers .slicer-pill');
    slicerPills.forEach(p => {
      p.classList.remove('active');
      if (p.getAttribute('data-floor-filter') === 'ALL') p.classList.add('active');
    });

    renderFloorReportTable();
    renderRelatedVersions();
    renderBomTable();
  }

  function renderFloorReportTable() {
    if (!floorReportTableBody || !currentFloorObsData) return;
    floorReportTableBody.innerHTML = '';

    const searchQuery = (floorReportSearch ? floorReportSearch.value : '').trim().toLowerCase();
    let rows = currentFloorObsData.rows;

    if (currentFloorFilter === 'DIFF') {
      rows = rows.filter(r => r.status === 'EXCESS' || r.status === 'SAVINGS' || r.status === 'UNLISTED');
    } else if (currentFloorFilter === 'EXCESS') {
      rows = rows.filter(r => r.status === 'EXCESS');
    } else if (currentFloorFilter === 'SAVINGS') {
      rows = rows.filter(r => r.status === 'SAVINGS');
    } else if (currentFloorFilter === 'MATCH') {
      rows = rows.filter(r => r.status === 'MATCH');
    } else if (currentFloorFilter === 'UNLISTED') {
      rows = rows.filter(r => r.status === 'UNLISTED');
    }

    if (searchQuery) {
      rows = rows.filter(r => 
        (r.rmCode && r.rmCode.toLowerCase().includes(searchQuery)) ||
        (r.rmName && r.rmName.toLowerCase().includes(searchQuery)) ||
        (r.rmGroup && r.rmGroup.toLowerCase().includes(searchQuery)) ||
        (r.note && r.note.toLowerCase().includes(searchQuery)) ||
        (r.majorCategory && r.majorCategory.toLowerCase().includes(searchQuery))
      );
    }

    if (rows.length === 0) {
      floorReportTableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 24px; color: #94a3b8; font-size: 13px;">No items match the selected filter.</td></tr>`;
      return;
    }

    let sl = 1;
    rows.forEach(r => {
      const tr = document.createElement('tr');
      let statusBadge = '';
      let costDiffHtml = '';
      let qtyDiffHtml = '';

      if (r.status === 'EXCESS') {
        tr.className = 'floor-row-excess';
        statusBadge = `<span class="diff-badge removed" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;">🔴 Excess</span>`;
        qtyDiffHtml = `<strong style="color: #b91c1c;">+${formatNum(r.deltaQty, 4)}</strong>`;
        costDiffHtml = `<strong style="color: #b91c1c;">+৳${formatNum(r.costDeviation, 2)}</strong>`;
      } else if (r.status === 'SAVINGS') {
        tr.className = 'floor-row-savings';
        statusBadge = `<span class="diff-badge added" style="background:#dcfce7; color:#15803d; border:1px solid #86efac;">🟢 Savings</span>`;
        qtyDiffHtml = `<strong style="color: #15803d;">${formatNum(r.deltaQty, 4)}</strong>`;
        costDiffHtml = `<strong style="color: #15803d;">-৳${formatNum(Math.abs(r.costDeviation), 2)}</strong>`;
      } else if (r.status === 'MATCH') {
        tr.className = 'floor-row-match';
        statusBadge = `<span class="diff-badge same">⚪ Match</span>`;
        qtyDiffHtml = `<span style="color: #64748b;">0.00</span>`;
        costDiffHtml = `<span style="color: #64748b;">৳0.00</span>`;
      } else if (r.status === 'UNLISTED') {
        tr.className = 'floor-row-unlisted';
        statusBadge = `<span class="diff-badge changed" style="background:#fef3c7; color:#b45309; border:1px solid #fcd34d;">⚠️ Not in BOM</span>`;
        qtyDiffHtml = `<strong style="color: #b45309;">+${formatNum(r.deltaQty, 4)}</strong>`;
        costDiffHtml = `<span style="color: #92400e; font-size: 11px;">Unlisted RM</span>`;
      }

      const noteHtml = r.note ? `<div style="font-size: 11px; color: #b45309; margin-top: 3px; font-style: italic;">📝 ${escapeHtml(r.note)}</div>` : '';

      tr.innerHTML = `
        <td class="center-cell">${sl++}</td>
        <td>${statusBadge}</td>
        <td>${getGroupBadge(r.rmGroup)}</td>
        <td><strong style="color: #0284c7;">${r.rmCode}</strong></td>
        <td>
          <div style="font-weight: 600; color: #1e293b;">${escapeHtml(r.rmName)}</div>
          ${noteHtml}
        </td>
        <td class="center-cell">${r.uom}</td>
        <td class="num-cell">${formatNum(r.bomQty, 4)}</td>
        <td class="num-cell" style="font-weight: 700; background: #fffbeb; color: #92400e;">${formatNum(r.physicalQty, 4)}</td>
        <td class="num-cell">${qtyDiffHtml}</td>
        <td class="num-cell" style="color: #64748b;">৳${formatNum(r.price, 2)}</td>
        <td class="num-cell">${costDiffHtml}</td>
      `;
      floorReportTableBody.appendChild(tr);
    });
  }

  function exportFloorReportToExcel() {
    if (!currentFloorObsData || !currentFloorObsData.rows) {
      alert('No floor report data to export. Please generate report first.');
      return;
    }
    const { itemCode, version, itemName, rows, kpis, counts } = currentFloorObsData;
    const filename = `Floor_Deviation_Report_${itemCode}_${version || 'Std'}.xlsx`;

    let sl = 1;
    const exportRows = rows.map(r => ({
      "SL": sl++,
      "Audit Status": r.status,
      "RM Group": (RM_GROUP_CONFIG[r.rmGroup] ? RM_GROUP_CONFIG[r.rmGroup].label : r.rmGroup),
      "RM Code": r.rmCode,
      "RM Name": r.rmName,
      "Audit Observation / Note": r.note || '',
      "Major Category": r.majorCategory || '',
      "UOM": r.uom,
      "Standard BOM Qty": r.bomQty,
      "Physical Floor Qty": r.physicalQty,
      "Delta Qty": r.deltaQty,
      "Unit Price (BDT)": r.price,
      "Cost Deviation (BDT)": r.costDeviation
    }));

    const wsRows = XLSX.utils.json_to_sheet(exportRows);

    const summaryData = [
      { "Metric": "Finished Good Item Code", "Value": itemCode },
      { "Metric": "BOM Version", "Value": version || 'Standard' },
      { "Metric": "Model Description", "Value": itemName },
      { "Metric": "Standard BOM Cost (Audited Items)", "Value": kpis.totalBomCost },
      { "Metric": "Physical Floor Cost (Audited Items)", "Value": kpis.totalObsCost },
      { "Metric": "Net Cost Deviation (BDT)", "Value": kpis.netCostDeviation },
      { "Metric": "Net Cost Variance (%)", "Value": `${kpis.diffPct.toFixed(2)}%` },
      { "Metric": "🔴 Excess Items (Floor > BOM)", "Value": counts.excess },
      { "Metric": "🟢 Savings Items (Floor < BOM)", "Value": counts.savings },
      { "Metric": "⚪ Exact Match Items", "Value": counts.match },
      { "Metric": "⚠️ Unlisted in BOM", "Value": counts.unlisted },
      { "Metric": "Total Audited Components", "Value": counts.all }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Audit Summary");
    XLSX.utils.book_append_sheet(wb, wsRows, "Floor vs BOM Deviations");
    XLSX.writeFile(wb, filename);
  }

  function exportFloorReportToCsv() {
    if (!currentFloorObsData || !currentFloorObsData.rows) {
      alert('No floor report data to export. Please generate report first.');
      return;
    }
    const { itemCode, version, rows } = currentFloorObsData;
    const filename = `Floor_Deviation_Report_${itemCode}_${version || 'Std'}.csv`;

    let sl = 1;
    const exportRows = rows.map(r => ({
      "SL": sl++,
      "Audit Status": r.status,
      "RM Group": (RM_GROUP_CONFIG[r.rmGroup] ? RM_GROUP_CONFIG[r.rmGroup].label : r.rmGroup),
      "RM Code": r.rmCode,
      "RM Name": r.rmName,
      "Audit Observation / Note": r.note || '',
      "Major Category": r.majorCategory || '',
      "UOM": r.uom,
      "Standard BOM Qty": r.bomQty,
      "Physical Floor Qty": r.physicalQty,
      "Delta Qty": r.deltaQty,
      "Unit Price (BDT)": r.price,
      "Cost Deviation (BDT)": r.costDeviation
    }));

    const csv = Papa.unparse(exportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  function exportFloorReportToHtml() {
    if (!currentFloorObsData || !currentFloorObsData.rows) {
      alert('No floor report data to export. Please generate report first.');
      return;
    }
    const { itemCode, version, itemName } = currentFloorObsData;
    const filename = `Floor_Deviation_Report_${itemCode}_${version || 'Std'}.html`;
    const emailHtml = buildRiEmailHtml();

    const fullDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Floor Deviation Report - #${itemCode} (${version || 'Standard'})</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 28px; background: #ffffff; color: #0f172a; }
    h2 { margin-top: 0; color: #0284c7; }
  </style>
</head>
<body>
  <h2>Walton Hi-Tech Industries PLC - BOM Physical Deviation Report</h2>
  <p><strong>FG Item Code:</strong> #${itemCode} | <strong>Model:</strong> ${escapeHtml(itemName)} | <strong>Version:</strong> ${escapeHtml(version || 'Standard')}</p>
  <hr style="border: none; border-top: 1px solid #cbd5e1; margin-bottom: 16px;">
  ${emailHtml}
</body>
</html>`;

    const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  // -------------------------------------------------------------
  // Related Platform Versions & Official Concern R&I Email Generator
  // -------------------------------------------------------------
  function getRelatedModels(targetItem, catalog = allItems) {
    if (!targetItem) {
      return {
        target: null,
        seriesKey: '',
        verSuffix: '',
        unit: '',
        primarySiblings: [],
        otherSiblings: []
      };
    }

    const code = String(targetItem.ItemCode || '').trim();
    const ver = String(targetItem.Version || '').trim();
    const name = String(targetItem.ItemName || '').trim();

    // 1. Extract version suffix (e.g. 1015 from DIMND-1015, 1216 from OCNUS-1216, 2326 from DIMND-2326)
    let verSuffix = '';
    const verMatch = ver.match(/\b(\d{3,4})\b/) || ver.match(/(\d{3,4})/);
    if (verMatch) {
      verSuffix = verMatch[1];
    }

    // 2. Extract series key:
    // Pattern A: WSI24BMB2, WSI12AJB2, WSN18KB, WCD60FS
    // Pattern B: WSI-OCEANUS...-12J, WSN-DIAMOND-12J -> Capacity 12J
    let seriesKey = '';
    let capacityKey = '';
    let seriesDisplay = '';

    const seriesMatch = name.match(/\b(W[SN][I|N|C]\d{2}[A-Z0-9]+)\b/i) || name.match(/\b([A-Z]{3,4}\d{2}[A-Z0-9]+)\b/i);
    if (seriesMatch) {
      seriesKey = seriesMatch[1].toUpperCase();
      seriesDisplay = seriesKey;
    } else {
      const capMatch = name.match(/\b(W[SN]I\s*-[A-Za-z0-9\(\)\s]+-(\d{2}[A-Z]*))\b/i);
      if (capMatch) {
        capacityKey = capMatch[2].toUpperCase();
        seriesDisplay = `WSI-${capacityKey}`;
      } else {
        const simpleCap = name.match(/\b(\d{2}[A-Z]{1,3})\b/i);
        if (simpleCap) {
          capacityKey = simpleCap[1].toUpperCase();
          seriesDisplay = capacityKey;
        }
      }
    }

    const isOutdoor = /Outdoor/i.test(name);
    const isIndoor = /Indoor/i.test(name);
    const unit = isOutdoor ? 'Outdoor' : (isIndoor ? 'Indoor' : '');

    const matchingSameUnit = [];
    const matchingOtherUnit = [];
    const seenSameUnit = new Set();
    const seenOtherUnit = new Set();

    // Always put target item first in primarySiblings
    matchingSameUnit.push(targetItem);
    seenSameUnit.add(`${code}_${ver}`);

    catalog.forEach(it => {
      if (!it || !it.ItemCode) return;
      const itCode = String(it.ItemCode).trim();
      const itVer = String(it.Version || '').trim();
      const itName = String(it.ItemName || '').trim();
      const key = `${itCode}_${itVer}`;

      if (key === `${code}_${ver}`) return; // Target already added

      let itSuffix = '';
      const m = itVer.match(/\b(\d{3,4})\b/) || itVer.match(/(\d{3,4})/);
      if (m) itSuffix = m[1];

      const itOutdoor = /Outdoor/i.test(itName);
      const itIndoor = /Indoor/i.test(itName);
      const itUnit = itOutdoor ? 'Outdoor' : (itIndoor ? 'Indoor' : '');

      let isSibling = false;

      // Rule 1: Matching series/capacity AND matching version suffix
      if (verSuffix && itSuffix && itSuffix === verSuffix) {
        if (seriesKey && itName.toUpperCase().includes(seriesKey)) {
          isSibling = true;
        } else if (capacityKey && itName.toUpperCase().includes(capacityKey) && /W[SN]I/i.test(itName)) {
          isSibling = true;
        }
      }

      // Rule 2: Same item code with alternative version
      const isSameCodeOtherVer = (itCode === code && itVer !== ver);

      if (isSibling) {
        if (unit && itUnit === unit) {
          if (!seenSameUnit.has(key)) {
            matchingSameUnit.push(it);
            seenSameUnit.add(key);
          }
        } else {
          if (!seenOtherUnit.has(key)) {
            matchingOtherUnit.push(it);
            seenOtherUnit.add(key);
          }
        }
      } else if (isSameCodeOtherVer) {
        if (!seenOtherUnit.has(key)) {
          matchingOtherUnit.push(it);
          seenOtherUnit.add(key);
        }
      }
    });

    return {
      target: targetItem,
      seriesKey: seriesDisplay || 'AC',
      verSuffix: verSuffix || (targetItem.Version || 'Std'),
      unit: unit || 'Unit',
      primarySiblings: matchingSameUnit,
      otherSiblings: matchingOtherUnit
    };
  }

  function formatCodesWithAmpersand(codeArray) {
    if (!codeArray || codeArray.length === 0) return '';
    if (codeArray.length === 1) return codeArray[0];
    if (codeArray.length === 2) return `${codeArray[0]} & ${codeArray[1]}`;
    const allButLast = codeArray.slice(0, -1).join(',');
    return `${allButLast} & ${codeArray[codeArray.length - 1]}`;
  }

  function getOrderedSelectedCodes() {
    if (!currentRelatedData || !selectedItem) {
      return selectedItem ? [String(selectedItem.ItemCode).trim()] : [];
    }
    const targetCode = String(selectedItem.ItemCode).trim();
    const list = [];
    if (selectedSiblingCodes.has(targetCode)) {
      list.push(targetCode);
    }
    currentRelatedData.primarySiblings.forEach(it => {
      const c = String(it.ItemCode).trim();
      if (c !== targetCode && selectedSiblingCodes.has(c)) {
        list.push(c);
      }
    });
    return list;
  }

  function buildRiEmailSubject() {
    if (!selectedItem) return '';
    const series = currentRelatedData ? currentRelatedData.seriesKey : 'RAC';
    const unit = currentRelatedData ? currentRelatedData.unit : '';
    const ver = currentRelatedData ? currentRelatedData.verSuffix : (selectedItem.Version || '');
    const mid = [series, unit, ver].filter(Boolean).join('-');

    const codes = getOrderedSelectedCodes();
    const codesStr = formatCodesWithAmpersand(codes);
    return `RE: Regarding Physical BOM Trail Observation Report of ${mid} (Item Code: ${codesStr} )`;
  }

  function updateRiEmailSubject() {
    const subject = buildRiEmailSubject();
    if (riEmailSubject) riEmailSubject.value = subject;
    const codes = getOrderedSelectedCodes();
    if (modalSelectedFgCount) {
      modalSelectedFgCount.textContent = `(${codes.length} Models: ${codes.join(', ')})`;
    }
    renderModalSiblingBadges();
    renderRiEmailPreview();
  }

  function renderRelatedVersions() {
    if (!selectedItem) return;
    currentRelatedData = getRelatedModels(selectedItem, allItems);
    selectedSiblingCodes = new Set(currentRelatedData.primarySiblings.map(it => String(it.ItemCode).trim()));

    const count = currentRelatedData.primarySiblings.length;
    if (relatedVersionsBadge) {
      relatedVersionsBadge.textContent = `${count} ${count === 1 ? 'Model' : 'Models'}`;
    }

    if (relatedPlatformSummary) {
      const p = currentRelatedData.seriesKey;
      const u = currentRelatedData.unit;
      const v = currentRelatedData.verSuffix;
      relatedPlatformSummary.innerHTML = `Platform: <strong>${escapeHtml(p)}</strong> | Type: <strong>${escapeHtml(u)}</strong> | Version Suffix: <strong>${escapeHtml(v)}</strong>`;
    }

    if (relatedSiblingsList) {
      relatedSiblingsList.innerHTML = '';
      currentRelatedData.primarySiblings.forEach(it => {
        const itCode = String(it.ItemCode).trim();
        const isTarget = (itCode === String(selectedItem.ItemCode).trim() && String(it.Version) === String(selectedItem.Version));
        const isChecked = selectedSiblingCodes.has(itCode);

        const chip = document.createElement('label');
        chip.style.cssText = `display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; user-select: none; transition: all 0.15s; border: 1.5px solid ${isTarget ? '#16a34a' : '#cbd5e1'}; background: ${isTarget ? '#f0fdf4' : '#ffffff'};`;

        chip.innerHTML = `
          <input type="checkbox" value="${itCode}" ${isChecked ? 'checked' : ''} style="cursor: pointer;" data-sibling-code="${itCode}">
          <strong style="color: #0369a1;">#${itCode}</strong>
          <span style="color: #334155; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(it.ItemName)} (${escapeHtml(it.Version)})">${escapeHtml(it.ItemName)} (${escapeHtml(it.Version)})</span>
          ${isTarget ? '<span style="font-size: 10px; background: #16a34a; color: white; padding: 1px 5px; border-radius: 999px; font-weight: 700;">AUDITED</span>' : ''}
        `;

        const cb = chip.querySelector('input[type="checkbox"]');
        cb.addEventListener('change', (e) => {
          if (e.target.checked) {
            selectedSiblingCodes.add(itCode);
          } else {
            selectedSiblingCodes.delete(itCode);
          }
          updateRiEmailSubject();
        });

        relatedSiblingsList.appendChild(chip);
      });
    }

    // Other siblings (Indoor / Alternative versions)
    if (relatedOtherCollapsible && relatedOtherSiblingsList) {
      const otherCount = currentRelatedData.otherSiblings.length;
      if (otherCount > 0) {
        relatedOtherCollapsible.style.display = 'block';
        if (relatedOtherToggleBtn) {
          relatedOtherToggleBtn.textContent = `▶ View ${otherCount} other related platform models (Indoor / Alternative Suffixes)`;
        }
        relatedOtherSiblingsList.innerHTML = '';
        currentRelatedData.otherSiblings.forEach(it => {
          const itCode = String(it.ItemCode).trim();
          const chip = document.createElement('div');
          chip.style.cssText = `display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 11.5px; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569;`;
          chip.innerHTML = `<strong style="color: #475569;">#${itCode}</strong> <span style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(it.ItemName)}">${escapeHtml(it.ItemName)} (${escapeHtml(it.Version)})</span>`;
          relatedOtherSiblingsList.appendChild(chip);
        });
      } else {
        relatedOtherCollapsible.style.display = 'none';
      }
    }
  }

  function renderModalSiblingBadges() {
    if (!modalSiblingBadges || !currentRelatedData) return;
    modalSiblingBadges.innerHTML = '';
    currentRelatedData.primarySiblings.forEach(it => {
      const itCode = String(it.ItemCode).trim();
      const isTarget = (itCode === String(selectedItem.ItemCode).trim() && String(it.Version) === String(selectedItem.Version));
      const isChecked = selectedSiblingCodes.has(itCode);

      const badge = document.createElement('label');
      badge.style.cssText = `display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; border: 1px solid ${isChecked ? '#3b82f6' : '#cbd5e1'}; background: ${isChecked ? '#dbeafe' : '#f8fafc'}; color: ${isChecked ? '#1e40af' : '#64748b'};`;
      badge.innerHTML = `
        <input type="checkbox" value="${itCode}" ${isChecked ? 'checked' : ''} style="cursor: pointer; transform: scale(0.9);">
        <strong>#${itCode}</strong> (${escapeHtml(it.Version)})
      `;

      const cb = badge.querySelector('input[type="checkbox"]');
      cb.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedSiblingCodes.add(itCode);
        } else {
          selectedSiblingCodes.delete(itCode);
        }
        if (relatedSiblingsList) {
          const mainCb = relatedSiblingsList.querySelector(`input[data-sibling-code="${itCode}"]`);
          if (mainCb) mainCb.checked = e.target.checked;
        }
        updateRiEmailSubject();
      });

      modalSiblingBadges.appendChild(badge);
    });
  }

  function buildRiEmailHtml() {
    if (!selectedItem || !currentFloorObsData) return '';
    const target = selectedItem;
    const targetCode = String(target.ItemCode).trim();
    const kpis = currentFloorObsData.kpis || { totalBomCost: 0, totalObsCost: 0, netCostDeviation: 0, diffPct: 0 };

    const totalDiffColor = kpis.netCostDeviation > 0.01 ? '#dc2626' : (kpis.netCostDeviation < -0.01 ? '#16a34a' : '#475569');
    const totalDiffSign = kpis.netCostDeviation > 0.005 ? '+' : (kpis.netCostDeviation < -0.005 ? '-' : '');

    // Target model line (Cyan highlight #00ffff)
    let targetHtml = `<div style="background-color: #00ffff; padding: 4px 8px; font-weight: bold; margin-bottom: 3px; font-family: Calibri, Arial, sans-serif; font-size: 13.5px; color: #000000; border-left: 4px solid #0891b2;">FG Code : ${escapeHtml(target.ItemCode)} Model : ${escapeHtml(target.ItemName)}; Version : ${escapeHtml(target.Version)}</div>`;

    // Sibling model lines (Yellow highlight #ffff00)
    let siblingsHtml = '';
    if (currentRelatedData && currentRelatedData.primarySiblings) {
      currentRelatedData.primarySiblings.forEach(it => {
        const c = String(it.ItemCode).trim();
        if (c !== targetCode && selectedSiblingCodes.has(c)) {
          siblingsHtml += `<div style="background-color: #ffff00; padding: 4px 8px; font-weight: bold; margin-bottom: 3px; font-family: Calibri, Arial, sans-serif; font-size: 13.5px; color: #000000; border-left: 4px solid #ca8a04;">FG Code: ${escapeHtml(it.ItemCode)}-${escapeHtml(it.ItemName)}; ${escapeHtml(it.Version)}</div>`;
        }
      });
    }

    // Discrepancy items for the table (Excess, Savings, Zero usage, Unlisted)
    const discrepancyRows = currentFloorObsData.rows.filter(r => r.status === 'EXCESS' || r.status === 'SAVINGS' || r.status === 'UNLISTED');
    const tableRows = discrepancyRows.length > 0 ? discrepancyRows : currentFloorObsData.rows;

    let rowsHtml = '';
    let sl = 1;
    tableRows.forEach(r => {
      let remarks = '';
      if (r.status === 'UNLISTED') {
        remarks = 'Physical item used but not mentioned in BOM';
      } else if (r.physicalQty === 0) {
        remarks = 'Not Used Physically';
      } else if (r.deltaQty > 0) {
        const diffStr = Number.isInteger(r.deltaQty) ? String(r.deltaQty) : formatNum(r.deltaQty, 4);
        remarks = `Physical usage is ${diffStr} ${escapeHtml(r.uom)} higher than BOM`;
      } else if (r.deltaQty < 0) {
        remarks = 'Physical usage is lower than BOM';
        if (r.note && /tolerance/i.test(r.note)) {
          remarks += ` (${escapeHtml(r.note)})`;
        }
      } else {
        remarks = 'Matched with BOM';
      }

      const bomQtyStr = Number.isInteger(r.bomQty) ? String(r.bomQty) : formatNum(r.bomQty, 8).replace(/\.?0+$/, '');
      const physQtyStr = Number.isInteger(r.physicalQty) ? String(r.physicalQty) : formatNum(r.physicalQty, 8).replace(/\.?0+$/, '');

      // Δ Qty formatting
      let deltaQtyHtml = '';
      if (r.deltaQty > 0.000001) {
        deltaQtyHtml = `<strong style="color: #dc2626;">+${formatNum(r.deltaQty, 4)}</strong>`;
      } else if (r.deltaQty < -0.000001) {
        deltaQtyHtml = `<strong style="color: #16a34a;">${formatNum(r.deltaQty, 4)}</strong>`;
      } else {
        deltaQtyHtml = `<span style="color: #64748b;">0</span>`;
      }

      // Price formatting
      const priceHtml = r.price > 0 ? `৳${formatNum(r.price, 2)}` : `<span style="color: #94a3b8;">৳0.00</span>`;

      // Cost Deviation formatting
      let costDevHtml = '';
      if (r.status === 'UNLISTED') {
        costDevHtml = `<span style="color: #b45309; font-size: 11px; font-weight: 600;">Unlisted RM</span>`;
      } else if (r.costDeviation > 0.005) {
        costDevHtml = `<strong style="color: #dc2626;">+৳${formatNum(r.costDeviation, 2)}</strong>`;
      } else if (r.costDeviation < -0.005) {
        costDevHtml = `<strong style="color: #16a34a;">-৳${formatNum(Math.abs(r.costDeviation), 2)}</strong>`;
      } else {
        costDevHtml = `<span style="color: #64748b;">৳0.00</span>`;
      }

      rowsHtml += `
        <tr>
          <td style="border: 1px solid #000000; padding: 5px 6px; text-align: center; font-size: 13px;">${sl++}</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center; font-size: 13px; font-weight: 600; color: #0284c7;">${escapeHtml(r.rmCode)}</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; font-size: 13px;">${escapeHtml(r.rmName)}</td>
          <td style="border: 1px solid #000000; padding: 5px 6px; text-align: center; font-size: 13px;">${escapeHtml(r.uom)}</td>
          <td style="border: 1px solid #000000; padding: 5px 6px; text-align: center; font-size: 13px;">${bomQtyStr}</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center; font-size: 13px; font-weight: bold; background-color: #fffbeb; color: #92400e;">${physQtyStr}</td>
          <td style="border: 1px solid #000000; padding: 5px 6px; text-align: center; font-size: 13px;">${deltaQtyHtml}</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; text-align: right; font-size: 13px; color: #475569;">${priceHtml}</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; text-align: right; font-size: 13px;">${costDevHtml}</td>
          <td style="border: 1px solid #000000; padding: 5px 8px; font-size: 12.5px;">${remarks}</td>
        </tr>`;
    });

    return `
      <div style="font-family: Calibri, Arial, sans-serif; font-size: 13.5px; color: #000000; line-height: 1.45;">
        <p style="margin: 0 0 4px 0; font-weight: bold;">Dear Concern/Sir,</p>
        <p style="margin: 0 0 6px 0;">Greetings of the day. Hope you are doing well.</p>
        <p style="margin: 0 0 12px 0;">The following discrepancies have been identified between the BOM and actual physical usage.</p>

        <div style="margin-bottom: 12px;">
          ${targetHtml}
          ${siblingsHtml}
        </div>

        <!-- Financial Summary Card -->
        <table cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin-top: 10px; margin-bottom: 12px; font-family: Calibri, Arial, sans-serif; font-size: 12.5px; border: 1.5px solid #cbd5e1; background-color: #f8fafc; width: 100%; max-width: 760px;">
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 12px;"><strong>Standard BOM Cost:</strong> ৳${formatNum(kpis.totalBomCost, 2)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 12px; background-color: #fffbeb; color: #92400e;"><strong>Floor Observed Cost:</strong> ৳${formatNum(kpis.totalObsCost, 2)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 14px; background-color: ${kpis.netCostDeviation > 0.01 ? '#fee2e2' : '#dcfce7'}; color: ${totalDiffColor};">
              <strong>Net Cost Deviation (Δ):</strong> ${totalDiffSign}৳${formatNum(Math.abs(kpis.netCostDeviation), 2)} (${kpis.diffPct.toFixed(2)}%)
            </td>
          </tr>
        </table>

        <!-- Observation Table with Deviation & Costing -->
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; font-size: 13px; text-align: left; border: 1px solid #000000; margin-top: 6px; margin-bottom: 14px;">
          <thead>
            <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
              <th style="border: 1px solid #000000; padding: 6px 5px; width: 30px; text-align: center;">SL</th>
              <th style="border: 1px solid #000000; padding: 6px 6px; width: 75px; text-align: center;">Item Code</th>
              <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left;">Item Description</th>
              <th style="border: 1px solid #000000; padding: 6px 4px; width: 45px; text-align: center;">UOM</th>
              <th style="border: 1px solid #000000; padding: 6px 6px; width: 70px; text-align: center;">BOM Qty</th>
              <th style="border: 1px solid #000000; padding: 6px 6px; width: 85px; text-align: center; background-color: #fef3c7; color: #92400e;">Physical Use Qty</th>
              <th style="border: 1px solid #000000; padding: 6px 6px; width: 75px; text-align: center;">Δ Qty</th>
              <th style="border: 1px solid #000000; padding: 6px 6px; width: 75px; text-align: right;">Price (৳)</th>
              <th style="border: 1px solid #000000; padding: 6px 8px; width: 95px; text-align: right;">Cost Deviation (৳)</th>
              <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left;">BOM Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #000000;">
              <td colspan="4" style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-weight: 700; font-size: 12.5px;">Total Cost Impact:</td>
              <td style="border: 1px solid #000000; padding: 6px 6px; text-align: center; font-size: 12px; color: #475569;">৳${formatNum(kpis.totalBomCost, 2)}</td>
              <td style="border: 1px solid #000000; padding: 6px 6px; text-align: center; font-size: 12px; font-weight: 700; background-color: #fef3c7; color: #92400e;">৳${formatNum(kpis.totalObsCost, 2)}</td>
              <td style="border: 1px solid #000000; padding: 6px 6px; text-align: center; font-size: 12px; color: #64748b;">-</td>
              <td style="border: 1px solid #000000; padding: 6px 6px; text-align: center; font-size: 12px; color: #64748b;">-</td>
              <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-size: 13.5px; font-weight: 800; color: ${totalDiffColor};">
                ${totalDiffSign}৳${formatNum(Math.abs(kpis.netCostDeviation), 2)}
              </td>
              <td style="border: 1px solid #000000; padding: 6px 8px; font-size: 12px; font-weight: 700; color: ${totalDiffColor};">
                ${kpis.netCostDeviation > 0.01 ? '🔴 Net Cost Increase' : (kpis.netCostDeviation < -0.01 ? '🟢 Net Cost Savings' : '⚪ Cost Neutral')} (${kpis.diffPct.toFixed(2)}%)
              </td>
            </tr>
          </tfoot>
        </table>

        <p style="margin: 14px 0 14px 0;">Please review and take necessary actions accordingly.</p>

        <div style="margin-top: 16px; font-size: 13px; line-height: 1.4;">
          <p style="margin: 0; font-weight: bold;">Regards,</p>
          <p style="margin: 0; font-weight: bold;">Md. Nazrul Islam(10778)</p>
          <p style="margin: 0;"><strong>DEPARTMENT:</strong> Process Development</p>
          <p style="margin: 0;"><strong>SECTION:</strong> Mechanical Process Development</p>
          <p style="margin: 0;"><strong>OU:</strong> Walton Hi-Tech Industries PLC</p>
          <p style="margin: 0;"><strong>Product:</strong> Commercial Air Conditioner.</p>
        </div>
      </div>
    `;
  }

  function buildRiEmailPlainText() {
    if (!selectedItem || !currentFloorObsData) return '';
    const target = selectedItem;
    const targetCode = String(target.ItemCode).trim();
    const kpis = currentFloorObsData.kpis || { totalBomCost: 0, totalObsCost: 0, netCostDeviation: 0, diffPct: 0 };
    const totalDiffSign = kpis.netCostDeviation > 0.005 ? '+' : (kpis.netCostDeviation < -0.005 ? '-' : '');

    let text = `Dear Concern/Sir,\nGreetings of the day. Hope you are doing well.\nThe following discrepancies have been identified between the BOM and actual physical usage.\n\n`;
    text += `FG Code : ${target.ItemCode} Model : ${target.ItemName}; Version : ${target.Version}\n`;

    if (currentRelatedData && currentRelatedData.primarySiblings) {
      currentRelatedData.primarySiblings.forEach(it => {
        const c = String(it.ItemCode).trim();
        if (c !== targetCode && selectedSiblingCodes.has(c)) {
          text += `FG Code: ${it.ItemCode}-${it.ItemName}; ${it.Version}\n`;
        }
      });
    }

    text += `\nCost Summary: Standard BOM: BDT ${formatNum(kpis.totalBomCost, 2)} | Floor Observed: BDT ${formatNum(kpis.totalObsCost, 2)} | Net Cost Deviation: ${totalDiffSign}BDT ${formatNum(Math.abs(kpis.netCostDeviation), 2)} (${kpis.diffPct.toFixed(2)}%)\n\n`;

    text += `SL | Item Code | Item Description | UOM | BOM Qty | Physical Use Qty | Delta Qty | Price (BDT) | Cost Deviation (BDT) | BOM Remarks\n`;

    const discrepancyRows = currentFloorObsData.rows.filter(r => r.status === 'EXCESS' || r.status === 'SAVINGS' || r.status === 'UNLISTED');
    const tableRows = discrepancyRows.length > 0 ? discrepancyRows : currentFloorObsData.rows;

    let sl = 1;
    tableRows.forEach(r => {
      let remarks = '';
      if (r.status === 'UNLISTED') remarks = 'Physical item used but not mentioned in BOM';
      else if (r.physicalQty === 0) remarks = 'Not Used Physically';
      else if (r.deltaQty > 0) remarks = `Physical usage is ${r.deltaQty} ${r.uom} higher than BOM`;
      else if (r.deltaQty < 0) {
        remarks = 'Physical usage is lower than BOM';
        if (r.note && /tolerance/i.test(r.note)) remarks += ` (${r.note})`;
      } else remarks = 'Matched with BOM';

      const deltaStr = r.deltaQty > 0 ? `+${r.deltaQty}` : `${r.deltaQty}`;
      const costDevStr = r.status === 'UNLISTED' ? 'Unlisted' : (r.costDeviation > 0 ? `+${formatNum(r.costDeviation, 2)}` : (r.costDeviation < 0 ? `-${formatNum(Math.abs(r.costDeviation), 2)}` : '0.00'));

      text += `${sl++} | ${r.rmCode} | ${r.rmName} | ${r.uom} | ${r.bomQty} | ${r.physicalQty} | ${deltaStr} | ${formatNum(r.price, 2)} | ${costDevStr} | ${remarks}\n`;
    });

    text += `\nTotal Cost Impact: BOM Cost: BDT ${formatNum(kpis.totalBomCost, 2)} | Floor Cost: BDT ${formatNum(kpis.totalObsCost, 2)} | Net Cost Deviation: ${totalDiffSign}BDT ${formatNum(Math.abs(kpis.netCostDeviation), 2)} (${kpis.diffPct.toFixed(2)}%)\n`;
    text += `\nPlease review and take necessary actions accordingly.\n\nRegards,\nMd. Nazrul Islam(10778)\nDEPARTMENT: Process Development\nSECTION: Mechanical Process Development\nOU: Walton Hi-Tech Industries PLC\nProduct: Commercial Air Conditioner.\n`;
    return text;
  }

  function renderRiEmailPreview() {
    if (!riEmailPreviewContainer) return;
    riEmailPreviewContainer.innerHTML = buildRiEmailHtml();
  }

  function openRiEmailModal() {
    if (!currentFloorObsData || !selectedItem) {
      alert('Please run floor observation audit first by clicking "Generate Report (Cost & Qty Deviation)".');
      return;
    }
    updateRiEmailSubject();
    renderRiEmailPreview();
    if (riEmailModal) riEmailModal.classList.add('show');
  }

  function closeRiEmailModal() {
    if (riEmailModal) riEmailModal.classList.remove('show');
  }

  async function copyEmailRichHtml() {
    const previewBox = document.getElementById('riEmailPreviewContainer');
    if (!previewBox) return;

    let copied = false;

    // Method 1: Range selection + execCommand('copy')
    // This puts CF_HTML into the Windows clipboard which Outlook Desktop natively parses with full colors, yellow/cyan highlights, and table borders!
    try {
      const range = document.createRange();
      range.selectNode(previewBox);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      copied = document.execCommand('copy');
      sel.removeAllRanges();
    } catch (e) {
      console.warn('execCommand copy failed:', e);
    }

    // Method 2: Modern navigator.clipboard with text/html Blob
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%;font-family:Calibri,Arial,sans-serif;}th,td{border:1px solid #000000;padding:5px 8px;}</style></head><body><!--StartFragment-->${previewBox.innerHTML}<!--EndFragment--></body></html>`;
        const blobHtml = new Blob([fullHtml], { type: 'text/html' });
        const blobPlain = new Blob([buildRiEmailPlainText()], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })
        ]);
        copied = true;
      }
    } catch (err) {
      console.warn('navigator.clipboard failed:', err);
    }

    if (emailCopiedFeedback) {
      emailCopiedFeedback.style.display = 'inline-block';
      emailCopiedFeedback.style.background = '#dcfce7';
      emailCopiedFeedback.style.border = '1.5px solid #22c55e';
      emailCopiedFeedback.style.color = '#15803d';
      emailCopiedFeedback.style.padding = '6px 14px';
      emailCopiedFeedback.style.borderRadius = '6px';
      emailCopiedFeedback.innerHTML = '✓ <strong>Formatted Table Copied!</strong> Go to Outlook and press <strong>Ctrl + V</strong> in your message body.';
      setTimeout(() => {
        emailCopiedFeedback.style.display = 'none';
      }, 7000);
    }
  }

  function selectEmailContent() {
    const previewBox = document.getElementById('riEmailPreviewContainer');
    if (!previewBox) return;
    const range = document.createRange();
    range.selectNodeContents(previewBox);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('copy');
    if (emailCopiedFeedback) {
      emailCopiedFeedback.style.display = 'inline-block';
      emailCopiedFeedback.style.background = '#dcfce7';
      emailCopiedFeedback.style.border = '1.5px solid #22c55e';
      emailCopiedFeedback.style.color = '#15803d';
      emailCopiedFeedback.style.padding = '6px 14px';
      emailCopiedFeedback.style.borderRadius = '6px';
      emailCopiedFeedback.innerHTML = '✓ <strong>Table Selected & Copied!</strong> Switch to Outlook and press <strong>Ctrl + V</strong>.';
      setTimeout(() => {
        emailCopiedFeedback.style.display = 'none';
      }, 6000);
    }
  }

  function copyEmailPlainText() {
    const plain = buildRiEmailPlainText();
    navigator.clipboard.writeText(plain).then(() => {
      if (emailCopiedFeedback) {
        emailCopiedFeedback.style.display = 'inline-block';
        emailCopiedFeedback.textContent = '✓ Copied plain text to clipboard!';
        setTimeout(() => {
          emailCopiedFeedback.style.display = 'none';
        }, 3000);
      }
    });
  }

  function openInOutlookClient() {
    // 1. Automatically copy rich HTML table to clipboard so user can easily paste it
    copyEmailRichHtml();

    // 2. Open Outlook with To, Cc, Subject pre-filled
    const to = riEmailTo ? riEmailTo.value.trim() : '';
    const cc = riEmailCc ? riEmailCc.value.trim() : '';
    const subject = riEmailSubject ? riEmailSubject.value.trim() : buildRiEmailSubject();

    const plainText = buildRiEmailPlainText();
    const mailtoUri = `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
    window.open(mailtoUri, '_blank');

    if (emailCopiedFeedback) {
      emailCopiedFeedback.style.display = 'inline-block';
      emailCopiedFeedback.style.background = '#eff6ff';
      emailCopiedFeedback.style.border = '1.5px solid #3b82f6';
      emailCopiedFeedback.style.color = '#1e40af';
      emailCopiedFeedback.style.padding = '8px 16px';
      emailCopiedFeedback.style.borderRadius = '6px';
      emailCopiedFeedback.innerHTML = '📧 <strong>Outlook draft opened with Subject & Recipients!</strong><br><span style="font-size: 11.5px;">For the rich colored table with Deviation & Costing: Simply click into Outlook email body, press <strong>Ctrl + A</strong>, then press <strong>Ctrl + V</strong>!</span>';
      setTimeout(() => {
        emailCopiedFeedback.style.display = 'none';
      }, 9000);
    }
  }

  function copyRelatedFgCodes() {
    const codes = getOrderedSelectedCodes();
    if (codes.length === 0) {
      alert('No related codes selected.');
      return;
    }
    const text = codes.join(', ');
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied ${codes.length} FG Codes to clipboard:\n${text}`);
    });
  }

  function downloadEmailReportHtml() {
    if (!selectedItem || !currentFloorObsData) {
      alert('Please generate the floor observation report first.');
      return;
    }
    const filename = `Concern_RI_Email_Report_${selectedItem.ItemCode}_${selectedItem.Version || 'Std'}.html`;
    const emailHtml = buildRiEmailHtml();
    const subject = riEmailSubject ? riEmailSubject.value : buildRiEmailSubject();

    const fullDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 30px; background: #ffffff; color: #000000; line-height: 1.45; }
    .email-subject { font-size: 15px; font-weight: bold; background: #f1f5f9; padding: 10px 14px; border-left: 4px solid #0284c7; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="email-subject">Subject: ${escapeHtml(subject)}</div>
  ${emailHtml}
</body>
</html>`;

    const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  // -------------------------------------------------------------
  // Exports
  // -------------------------------------------------------------
  function exportDeviationToExcel() {
    if (!currentDeviationData || !currentDeviationData.deviations) {
      alert('No deviation data to export. Please run comparison first.');
      return;
    }

    const { beforeCode, beforeVer, afterCode, afterVer, deviations, totalBeforeCost, totalAfterCost, costDiff, diffPct } = currentDeviationData;
    const filename = `BOM_Deviation_${beforeCode}_${beforeVer || 'Std'}_vs_${afterCode}_${afterVer || 'Std'}.xlsx`;

    let sl = 1;
    const exportRows = deviations.map(d => ({
      "SL": sl++,
      "Change Type": d.type,
      "RM Group": (RM_GROUP_CONFIG[d.rmGroup] ? RM_GROUP_CONFIG[d.rmGroup].label : d.rmGroup),
      "RM Code": d.rmCode,
      "RM Name": d.rmName,
      "Major Category": d.majorCategory,
      "Minor Category": d.minorCategory,
      "UOM": d.uom,
      "Before Qty": d.beforeQty !== null ? d.beforeQty : 0,
      "After Qty": d.afterQty !== null ? d.afterQty : 0,
      "Delta Qty": d.deltaQty,
      "Unit Price (BDT)": d.price,
      "Cost Impact (BDT)": d.costImpact
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);

    const summaryData = [
      { "Metric": "Comparison", "Value": `Before: #${beforeCode} (${beforeVer || 'Std'}) vs After: #${afterCode} (${afterVer || 'Std'})` },
      { "Metric": "Before Total Cost (BDT)", "Value": totalBeforeCost },
      { "Metric": "After Total Cost (BDT)", "Value": totalAfterCost },
      { "Metric": "Cost Variance (BDT)", "Value": costDiff },
      { "Metric": "Cost Variance (%)", "Value": `${diffPct.toFixed(2)}%` },
      { "Metric": "🟢 Added Components", "Value": currentDeviationData.counts.added },
      { "Metric": "🔴 Removed Components", "Value": currentDeviationData.counts.removed },
      { "Metric": "🟡 Qty Changed Components", "Value": currentDeviationData.counts.changed },
      { "Metric": "⚪ Unchanged Components", "Value": currentDeviationData.counts.same },
      { "Metric": "Total Combined Components", "Value": currentDeviationData.counts.total }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Deviation Summary");
    XLSX.utils.book_append_sheet(wb, ws, "Component Deviations");
    XLSX.writeFile(wb, filename);
  }

  function exportDeviationToCsv() {
    if (!currentDeviationData || !currentDeviationData.deviations) {
      alert('No deviation data to export. Please run comparison first.');
      return;
    }

    const { beforeCode, beforeVer, afterCode, afterVer, deviations } = currentDeviationData;
    const filename = `BOM_Deviation_${beforeCode}_${beforeVer || 'Std'}_vs_${afterCode}_${afterVer || 'Std'}.csv`;

    let sl = 1;
    const exportRows = deviations.map(d => ({
      "SL": sl++,
      "Change Type": d.type,
      "RM Group": (RM_GROUP_CONFIG[d.rmGroup] ? RM_GROUP_CONFIG[d.rmGroup].label : d.rmGroup),
      "RM Code": d.rmCode,
      "RM Name": d.rmName,
      "Major Category": d.majorCategory,
      "Minor Category": d.minorCategory,
      "UOM": d.uom,
      "Before Qty": d.beforeQty !== null ? d.beforeQty : 0,
      "After Qty": d.afterQty !== null ? d.afterQty : 0,
      "Delta Qty": d.deltaQty,
      "Unit Price (BDT)": d.price,
      "Cost Impact (BDT)": d.costImpact
    }));

    const csv = Papa.unparse(exportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  function exportSingleExcel() {
    if (!currentBomData || !currentBomData.Components) return;
    const filename = `BOM_${selectedItem.ItemCode}_${selectedItem.Version || 'Std'}.xlsx`;
    const rows = currentBomData.Components.map(c => ({
      "SL": c.SL, "Major Category": c.MajorCategory, "Minor Category": c.MinorCategory,
      "RM Code": c.RmCode, "RM Name": c.RmName, "UOM": c.UOM,
      "BOM Qty": c.Qty, "Price": c.Price, "Value": c.Value
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BOM Components");
    XLSX.writeFile(wb, filename);
  }

  function exportSingleCsv() {
    if (!currentBomData || !currentBomData.Components) return;
    const filename = `BOM_${selectedItem.ItemCode}_${selectedItem.Version || 'Std'}.csv`;
    const rows = currentBomData.Components.map(c => ({
      "SL": c.SL, "Major Category": c.MajorCategory, "Minor Category": c.MinorCategory,
      "RM Code": c.RmCode, "RM Name": c.RmName, "UOM": c.UOM,
      "BOM Qty": c.Qty, "Price": c.Price, "Value": c.Value
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // MODULE: RM WHERE-USED FINDER (RAC / CAC / CHILLER)
  // -------------------------------------------------------------

  function getWhereUsedData() {
    if (typeof RM_WHERE_USED_DATA !== 'undefined' && RM_WHERE_USED_DATA) return RM_WHERE_USED_DATA;
    if (typeof window !== 'undefined' && window.RM_WHERE_USED_DATA) return window.RM_WHERE_USED_DATA;
    return null;
  }

  function ensureWhereUsedDataReady(callback) {
    const data = getWhereUsedData();
    if (data) {
      if (whereUsedLoadingNotice) whereUsedLoadingNotice.style.display = 'none';
      if (callback) callback();
      return;
    }

    if (whereUsedLoadingNotice) whereUsedLoadingNotice.style.display = 'block';

    let script = document.querySelector('script[src="rm_where_used_data.js"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'rm_where_used_data.js';
      document.head.appendChild(script);
    }

    const checkInterval = setInterval(() => {
      const d = getWhereUsedData();
      if (d) {
        clearInterval(checkInterval);
        if (whereUsedLoadingNotice) whereUsedLoadingNotice.style.display = 'none';
        if (callback) callback();
      }
    }, 50);

    script.onerror = () => {
      clearInterval(checkInterval);
      if (whereUsedLoadingNotice) {
        whereUsedLoadingNotice.innerHTML = `
          <div style="color: #dc2626; font-weight: 700; font-size: 14px;">⚠️ Failed to load rm_where_used_data.js</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Please ensure the file exists in workspace.</div>
        `;
      }
    };
  }

  let wuRmSuggestDebounceTimer = null;
  let wuRmSuggestActiveIndex = -1;
  let wuRmCurrentSuggestions = [];

  function searchRmByName(query, limit = 30) {
    const data = getWhereUsedData();
    if (!data || !data.meta) return [];
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const qTokens = q.split(/\s+/).filter(Boolean);
    const matches = [];

    for (const [code, meta] of Object.entries(data.meta)) {
      const name = (meta[0] || '').toLowerCase();
      // Token match: check if every token exists in name or code
      const allTokensMatch = qTokens.every(tok => name.includes(tok) || code.includes(tok));
      if (allTokensMatch) {
        const usages = (data.usages && data.usages[code]) ? data.usages[code].length : 0;
        matches.push({
          code,
          name: meta[0],
          uom: meta[1],
          price: parseFloat(meta[2]) || 0,
          usages
        });
        if (matches.length >= 120) break;
      }
    }

    // Sort by: exact start with query, then by usages count descending
    matches.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aStarts = aName.startsWith(q) || a.code === q ? 1 : 0;
      const bStarts = bName.startsWith(q) || b.code === q ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;
      return b.usages - a.usages;
    });

    return matches.slice(0, limit);
  }

  function renderRmSuggestions(matches) {
    if (!whereUsedRmSuggestDropdown) return;
    wuRmCurrentSuggestions = matches || [];
    wuRmSuggestActiveIndex = -1;

    if (!matches || matches.length === 0) {
      whereUsedRmSuggestDropdown.style.display = 'none';
      if (wuRmNameMatchBadge) wuRmNameMatchBadge.style.display = 'none';
      return;
    }

    if (wuRmNameMatchBadge) {
      wuRmNameMatchBadge.textContent = `${matches.length} matches`;
      wuRmNameMatchBadge.style.display = 'inline';
    }

    let html = '';
    matches.forEach((item, idx) => {
      html += `
        <div class="rm-suggest-item" data-index="${idx}" data-code="${escapeHtml(item.code)}">
          <span class="rm-suggest-code">${escapeHtml(item.code)}</span>
          <span class="rm-suggest-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <div class="rm-suggest-meta">
            <span class="rm-suggest-pill">${escapeHtml(item.uom)}</span>
            <span class="rm-suggest-pill" style="color: #0369a1; font-weight: 700;">&#2547;${formatNum(item.price, 2)}</span>
            <span class="rm-suggest-pill" style="background: #f0fdf4; color: #15803d; font-weight: 700;">${item.usages} models</span>
          </div>
        </div>
      `;
    });

    whereUsedRmSuggestDropdown.innerHTML = html;
    whereUsedRmSuggestDropdown.style.display = 'block';

    whereUsedRmSuggestDropdown.querySelectorAll('.rm-suggest-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        selectRmSuggestion(idx);
      });
    });
  }

  function selectRmSuggestionItem(item) {
    if (!item) return;
    if (whereUsedRmCode) whereUsedRmCode.value = item.code;
    if (whereUsedRmNameInput) whereUsedRmNameInput.value = item.name;
    if (btnClearWhereUsedRm) btnClearWhereUsedRm.style.display = 'block';
    if (btnClearWhereUsedRmName) btnClearWhereUsedRmName.style.display = 'block';
    if (whereUsedRmSuggestDropdown) whereUsedRmSuggestDropdown.style.display = 'none';
    if (wuRmNameMatchBadge) wuRmNameMatchBadge.style.display = 'none';
    runWhereUsedSearch(item.code);
  }

  function selectRmSuggestion(index) {
    if (!wuRmCurrentSuggestions || !wuRmCurrentSuggestions[index]) return;
    selectRmSuggestionItem(wuRmCurrentSuggestions[index]);
  }

  function handleRmNameInput() {
    if (!whereUsedRmNameInput) return;
    const val = whereUsedRmNameInput.value.trim();
    if (btnClearWhereUsedRmName) {
      btnClearWhereUsedRmName.style.display = val ? 'block' : 'none';
    }

    if (!val) {
      if (whereUsedRmSuggestDropdown) whereUsedRmSuggestDropdown.style.display = 'none';
      if (wuRmNameMatchBadge) wuRmNameMatchBadge.style.display = 'none';
      return;
    }

    ensureWhereUsedDataReady(() => {
      clearTimeout(wuRmSuggestDebounceTimer);
      wuRmSuggestDebounceTimer = setTimeout(() => {
        const matches = searchRmByName(val, 30);
        renderRmSuggestions(matches);
      }, 120);
    });
  }

  function executeWhereUsedFromInputs() {
    const code = whereUsedRmCode ? whereUsedRmCode.value.trim() : '';
    if (code) {
      runWhereUsedSearch(code);
      return;
    }
    const nameVal = whereUsedRmNameInput ? whereUsedRmNameInput.value.trim() : '';
    if (nameVal) {
      ensureWhereUsedDataReady(() => {
        const matches = searchRmByName(nameVal, 5);
        if (matches.length > 0) {
          wuRmCurrentSuggestions = matches;
          selectRmSuggestionItem(matches[0]);
        } else {
          alert(`No raw material found matching "${nameVal}". Please try another keyword.`);
        }
      });
    }
  }

  function runWhereUsedSearch(targetCode) {
    const rawCode = targetCode || (whereUsedRmCode ? whereUsedRmCode.value : '');
    const code = String(rawCode).trim();

    if (!code) {
      if (whereUsedEmptyPrompt) whereUsedEmptyPrompt.style.display = 'block';
      if (whereUsedResultsSection) whereUsedResultsSection.style.display = 'none';
      return;
    }

    whereUsedActiveRm = code;
    if (whereUsedRmCode) whereUsedRmCode.value = code;
    if (btnClearWhereUsedRm) btnClearWhereUsedRm.style.display = 'block';

    ensureWhereUsedDataReady(() => {
      const data = getWhereUsedData();
      if (!data) return;

      const meta = data.meta ? data.meta[code] : null;
      const allUsages = (data.usages && data.usages[code]) ? data.usages[code] : [];

      if (!meta && allUsages.length === 0) {
        if (whereUsedEmptyPrompt) {
          whereUsedEmptyPrompt.style.display = 'block';
          whereUsedEmptyPrompt.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
            <div style="font-size: 16px; font-weight: 700; color: #b91c1c; margin-bottom: 6px;">RM Code "${escapeHtml(code)}" Not Found</div>
            <div style="font-size: 13px; color: #64748b; max-width: 500px; margin: 0 auto 14px;">
              No BOM records currently utilize Raw Material Item Code <strong>${escapeHtml(code)}</strong> across active RAC, CAC, or Chiller models.
            </div>
            <button type="button" class="btn" onclick="document.querySelector('.wu-sample-btn[data-rm=\\'113039\\']').click()"
                    style="padding: 8px 16px; font-size: 12.5px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer;">
              ⚡ Try Sample 113039 (Heat Shrink)
            </button>
          `;
        }
        if (whereUsedResultsSection) whereUsedResultsSection.style.display = 'none';
        return;
      }

      // Populate Header Card (EBS layout matching media_1789451453162.png)
      const rmName = meta ? meta[0] : (allUsages[0] ? allUsages[0][9] : 'Unknown');
      const uom = meta ? meta[1] : (allUsages[0] ? allUsages[0][5] : 'PCS');
      const unitPrice = meta ? parseFloat(meta[2]) : (allUsages[0] ? parseFloat(allUsages[0][10]) : 0);

      if (wuHeaderRmCode) wuHeaderRmCode.textContent = code;
      if (wuHeaderRmName) wuHeaderRmName.textContent = rmName;
      if (wuHeaderUom) wuHeaderUom.textContent = uom;
      if (wuHeaderUnitPrice) wuHeaderUnitPrice.textContent = formatNum(unitPrice, 4);

      if (whereUsedRmNameInput) whereUsedRmNameInput.value = rmName;
      if (btnClearWhereUsedRmName) btnClearWhereUsedRmName.style.display = 'block';
      if (whereUsedRmSuggestDropdown) whereUsedRmSuggestDropdown.style.display = 'none';
      if (wuRmNameMatchBadge) wuRmNameMatchBadge.style.display = 'none';

      // Filter by Org & Product Type
      applyWhereUsedFilters();

      if (whereUsedEmptyPrompt) whereUsedEmptyPrompt.style.display = 'none';
      if (whereUsedResultsSection) whereUsedResultsSection.style.display = 'block';
    });
  }

  function applyWhereUsedFilters() {
    const data = getWhereUsedData();
    if (!data || !whereUsedActiveRm) return;

    const allUsages = (data.usages && data.usages[whereUsedActiveRm]) ? data.usages[whereUsedActiveRm] : [];
    const selectedOrg = whereUsedOrgFilter ? whereUsedOrgFilter.value : 'ALL';
    const selectedType = whereUsedTypeFilter ? whereUsedTypeFilter.value : 'ALL';

    // Calculate global stats across all usages of this RM
    let racCount = 0;
    let cacCount = 0;
    let chillerCount = 0;
    let totalBOMValue = 0;

    allUsages.forEach(u => {
      const org = u[0];
      const model = u[4] || '';
      const isChiller = org === 'Chiller' || model.toLowerCase().includes('chiller');
      if (isChiller) chillerCount++;
      else if (org === 'RAC') racCount++;
      else if (org === 'CAC') cacCount++;
      totalBOMValue += (parseFloat(u[11]) || 0);
    });

    if (wuHeaderTotalCount) wuHeaderTotalCount.textContent = allUsages.length;
    if (wuHeaderRacCount) wuHeaderRacCount.textContent = racCount;
    if (wuHeaderCacCount) wuHeaderCacCount.textContent = cacCount;
    if (wuHeaderChillerCount) wuHeaderChillerCount.textContent = chillerCount;
    if (wuHeaderTotalValue) wuHeaderTotalValue.textContent = formatNum(totalBOMValue, 2);

    // Filter rows
    whereUsedCurrentRows = allUsages.filter(u => {
      const org = u[0];
      const type = u[1];
      const model = u[4] || '';
      const isChiller = org === 'Chiller' || model.toLowerCase().includes('chiller');

      // Org filter
      if (selectedOrg === 'RAC' && (org !== 'RAC' || isChiller)) return false;
      if (selectedOrg === 'CAC' && (org !== 'CAC' || isChiller)) return false;
      if (selectedOrg === 'Chiller' && !isChiller) return false;

      // Type filter
      if (selectedType !== 'ALL' && type !== selectedType) return false;

      return true;
    });

    whereUsedCurrentPage = 1;
    filterAndRenderWhereUsedTable();
  }

  function filterAndRenderWhereUsedTable() {
    const filterText = (wuTableSearchInput ? wuTableSearchInput.value : '').toLowerCase().trim();

    if (!filterText) {
      whereUsedFilteredRows = whereUsedCurrentRows;
      if (wuFilteredNote) wuFilteredNote.style.display = 'none';
    } else {
      whereUsedFilteredRows = whereUsedCurrentRows.filter(r => {
        return (r[0] && r[0].toLowerCase().includes(filterText)) ||
               (r[1] && r[1].toLowerCase().includes(filterText)) ||
               (r[2] && String(r[2]).toLowerCase().includes(filterText)) ||
               (r[3] && String(r[3]).toLowerCase().includes(filterText)) ||
               (r[4] && r[4].toLowerCase().includes(filterText)) ||
               (r[6] && r[6].toLowerCase().includes(filterText)) ||
               (r[7] && r[7].toLowerCase().includes(filterText)) ||
               (r[8] && r[8].toLowerCase().includes(filterText));
      });
      if (wuFilteredNote) {
        wuFilteredNote.style.display = 'inline';
        if (wuRawTotal) wuRawTotal.textContent = whereUsedCurrentRows.length;
      }
    }

    renderWhereUsedTablePage();
  }

  function renderWhereUsedTablePage() {
    if (!whereUsedTableBody) return;

    const total = whereUsedFilteredRows.length;
    const size = parseInt(wuPageSizeSelect ? wuPageSizeSelect.value : '25', 10);
    const isAll = size === -1;

    let totalPages = isAll ? 1 : Math.ceil(total / size);
    if (totalPages < 1) totalPages = 1;
    if (whereUsedCurrentPage > totalPages) whereUsedCurrentPage = totalPages;
    if (whereUsedCurrentPage < 1) whereUsedCurrentPage = 1;

    const startIdx = isAll ? 0 : (whereUsedCurrentPage - 1) * size;
    const endIdx = isAll ? total : Math.min(startIdx + size, total);
    const pageRows = whereUsedFilteredRows.slice(startIdx, endIdx);

    if (pageRows.length === 0) {
      whereUsedTableBody.innerHTML = `
        <tr>
          <td colspan="15" style="text-align: center; padding: 36px 12px; color: #64748b;">
            <div style="font-size: 24px; margin-bottom: 6px;">🔍</div>
            <div style="font-weight: 700; font-size: 14px; color: #334155;">No matching BOM models found</div>
            <div style="font-size: 12px; margin-top: 4px;">Try changing the search filter or organization dropdown.</div>
          </td>
        </tr>
      `;
      if (wuPageStart) wuPageStart.textContent = '0';
      if (wuPageEnd) wuPageEnd.textContent = '0';
      if (wuPageTotal) wuPageTotal.textContent = total;
      if (wuFootPageQty) wuFootPageQty.textContent = '0';
      if (wuFootPageValue) wuFootPageValue.textContent = '৳0.00';
      renderWhereUsedPagination(0, 1);
      return;
    }

    let pageSumQty = 0;
    let pageSumValue = 0;

    let html = '';
    for (let i = 0; i < pageRows.length; i++) {
      const r = pageRows[i];
      const sl = startIdx + i + 1;
      const org = r[0];
      const pType = r[1];
      const pSize = r[2];
      const pCode = r[3];
      const pModel = r[4];
      const uom = r[5];
      const ver = r[6];
      const subInv = r[7];
      const loc = r[8];
      const qty = parseFloat(r[9]) || 0;
      const price = parseFloat(r[10]) || 0;
      const val = parseFloat(r[11]) || 0;

      pageSumQty += qty;
      pageSumValue += val;

      const orgBadgeClass = org === 'RAC' ? 'badge-org-rac' : (org === 'CAC' ? 'badge-org-cac' : 'badge-org-chiller');
      const typeBadgeClass = pType === 'SEMI FINISHED' ? 'badge-type-sfg' : 'badge-type-fg';

      html += `
        <tr>
          <td style="text-align: center; color: #64748b; font-weight: 600;">${sl}</td>
          <td style="text-align: center;"><span class="${orgBadgeClass}">${escapeHtml(org)}</span></td>
          <td><span class="${typeBadgeClass}">${escapeHtml(pType)}</span></td>
          <td style="text-align: center; font-weight: 700; color: #0f172a;">${escapeHtml(pSize || '-')}</td>
          <td style="text-align: center;">
            <a class="ebs-link wu-open-model-link" data-code="${escapeHtml(pCode)}" data-ver="${escapeHtml(ver)}" title="Click to open full BOM in Single BOM Explorer">
              ${escapeHtml(pCode)}
            </a>
          </td>
          <td style="font-weight: 500; max-width: 320px; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(pModel)}">
            ${escapeHtml(pModel)}
          </td>
          <td style="text-align: center; color: #475569;">${escapeHtml(uom)}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 700; color: #0284c7;">${escapeHtml(ver || 'Standard')}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 600; color: #475569;">${escapeHtml(whereUsedActiveRm)}</td>
          <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(wuHeaderRmName ? wuHeaderRmName.textContent : '')}">
            ${escapeHtml(wuHeaderRmName ? wuHeaderRmName.textContent : '')}
          </td>
          <td class="col-subinv" style="font-weight: 600; color: #334155;">${escapeHtml(subInv || '-')}</td>
          <td class="col-location" style="font-size: 11px; color: #64748b;">${escapeHtml(loc || '-')}</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatNum(qty, 4)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600; color: #0284c7; background: #f8fafc;">${formatNum(price, 4)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #15803d; background: #f8fafc;">&#2547;${formatNum(val, 4)}</td>
        </tr>
      `;
    }

    whereUsedTableBody.innerHTML = html;

    if (wuPageStart) wuPageStart.textContent = startIdx + 1;
    if (wuPageEnd) wuPageEnd.textContent = endIdx;
    if (wuPageTotal) wuPageTotal.textContent = total;
    if (wuFootPageQty) wuFootPageQty.textContent = formatNum(pageSumQty, 4);
    if (wuFootPageValue) wuFootPageValue.textContent = '\u09F3' + formatNum(pageSumValue, 2);

    renderWhereUsedPagination(total, totalPages);

    // Attach click handlers to open in Single BOM Explorer
    whereUsedTableBody.querySelectorAll('.wu-open-model-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const code = link.getAttribute('data-code');
        const ver = link.getAttribute('data-ver');
        openModelInSingleExplorer(code, ver);
      });
    });
  }

  function renderWhereUsedPagination(total, totalPages) {
    if (!wuPaginationControls) return;

    if (totalPages <= 1) {
      wuPaginationControls.innerHTML = '';
      return;
    }

    let pButtons = '';

    // Previous Button
    pButtons += `
      <button type="button" class="btn-util" style="padding: 4px 8px;" ${whereUsedCurrentPage === 1 ? 'disabled' : ''} id="wuBtnPrev">
        ‹ Prev
      </button>
    `;

    // Page number buttons
    const maxButtons = 7;
    let startPage = Math.max(1, whereUsedCurrentPage - 3);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      pButtons += `<button type="button" class="btn-util wu-page-btn" data-page="1" style="padding: 4px 8px;">1</button>`;
      if (startPage > 2) pButtons += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
    }

    for (let p = startPage; p <= endPage; p++) {
      const isActive = p === whereUsedCurrentPage;
      pButtons += `
        <button type="button" class="btn-util wu-page-btn ${isActive ? 'active' : ''}" data-page="${p}"
                style="padding: 4px 10px; ${isActive ? 'background: #0284c7; color: white; border-color: #0284c7; font-weight: 700;' : ''}">
          ${p}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pButtons += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
      pButtons += `<button type="button" class="btn-util wu-page-btn" data-page="${totalPages}" style="padding: 4px 8px;">${totalPages}</button>`;
    }

    // Next Button
    pButtons += `
      <button type="button" class="btn-util" style="padding: 4px 8px;" ${whereUsedCurrentPage === totalPages ? 'disabled' : ''} id="wuBtnNext">
        Next ›
      </button>
    `;

    wuPaginationControls.innerHTML = pButtons;

    // Attach pagination clicks
    const prevBtn = wuPaginationControls.querySelector('#wuBtnPrev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (whereUsedCurrentPage > 1) {
          whereUsedCurrentPage--;
          renderWhereUsedTablePage();
        }
      });
    }

    const nextBtn = wuPaginationControls.querySelector('#wuBtnNext');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (whereUsedCurrentPage < totalPages) {
          whereUsedCurrentPage++;
          renderWhereUsedTablePage();
        }
      });
    }

    wuPaginationControls.querySelectorAll('.wu-page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        whereUsedCurrentPage = parseInt(btn.getAttribute('data-page'), 10);
        renderWhereUsedTablePage();
      });
    });
  }

  function openModelInSingleExplorer(code, ver) {
    if (!code) return;
    switchView('explorer');
    if (searchItemCode) {
      searchItemCode.value = code;
    }
    applyFilters();
    const match = filteredItems.find(it => it.ItemCode === code && (!ver || it.Version === ver));
    if (match) {
      selectItem(match);
    } else if (filteredItems.length > 0) {
      selectItem(filteredItems[0]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exportWhereUsedToExcel() {
    if (!whereUsedFilteredRows || whereUsedFilteredRows.length === 0) {
      alert('No records available to export.');
      return;
    }

    const rmName = wuHeaderRmName ? wuHeaderRmName.textContent : '';
    const uom = wuHeaderUom ? wuHeaderUom.textContent : '';

    const exportData = [
      ['WALTON EBS - ITEM USED IN BOM REPORT'],
      [`RM Item Code: ${whereUsedActiveRm}`, `RM Name: ${rmName}`, `UOM: ${uom}`],
      [`Generated At: ${new Date().toLocaleString()}`, `Total Records: ${whereUsedFilteredRows.length}`],
      [],
      ['SL', 'Org', 'Product Type', 'Product Size', 'Product Code', 'Product Model', 'UOM', 'Version', 'RM Code', 'RM Name', 'Supply Sub-Inventory', 'Supply Location', 'Qty', 'Price (৳)', 'Value (৳)']
    ];

    whereUsedFilteredRows.forEach((r, idx) => {
      exportData.push([
        idx + 1,
        r[0], // Org
        r[1], // Product Type
        r[2], // Product Size
        r[3], // Product Code
        r[4], // Product Model
        r[5], // UOM
        r[6], // Version
        whereUsedActiveRm, // RM Code
        rmName, // RM Name
        r[7], // Sub-Inventory
        r[8], // Location
        r[9], // Qty
        r[10], // Price
        r[11]  // Value
      ]);
    });

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Item Used In BOM');
      const filename = `Walton_EBS_RM_Where_Used_${whereUsedActiveRm}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } else {
      exportWhereUsedToCsv();
    }
  }

  function exportWhereUsedToCsv() {
    if (!whereUsedFilteredRows || whereUsedFilteredRows.length === 0) return;

    const rmName = wuHeaderRmName ? wuHeaderRmName.textContent : '';
    const headers = ['SL', 'Org', 'Product Type', 'Product Size', 'Product Code', 'Product Model', 'UOM', 'Version', 'RM Code', 'RM Name', 'Supply Sub-Inventory', 'Supply Location', 'Qty', 'Price (BDT)', 'Value (BDT)'];
    
    const rows = whereUsedFilteredRows.map((r, idx) => [
      idx + 1,
      r[0],
      r[1],
      r[2],
      r[3],
      `"${(r[4] || '').replace(/"/g, '""')}"`,
      r[5],
      r[6],
      whereUsedActiveRm,
      `"${rmName.replace(/"/g, '""')}"`,
      r[7],
      r[8],
      r[9],
      r[10],
      r[11]
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Walton_EBS_RM_Where_Used_${whereUsedActiveRm}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }

  function bindWhereUsedEvents() {
    if (tabBtnWhereUsed) {
      tabBtnWhereUsed.addEventListener('click', () => switchView('whereused'));
    }

    if (btnSearchWhereUsed) {
      btnSearchWhereUsed.addEventListener('click', executeWhereUsedFromInputs);
    }

    if (whereUsedRmCode) {
      whereUsedRmCode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeWhereUsedFromInputs();
        }
      });
      whereUsedRmCode.addEventListener('input', () => {
        const code = whereUsedRmCode.value.trim();
        if (btnClearWhereUsedRm) {
          btnClearWhereUsedRm.style.display = code ? 'block' : 'none';
        }
        // Auto-populate RM Name if exact code is found in index
        const data = getWhereUsedData();
        if (data && data.meta && data.meta[code]) {
          if (whereUsedRmNameInput) whereUsedRmNameInput.value = data.meta[code][0];
          if (btnClearWhereUsedRmName) btnClearWhereUsedRmName.style.display = 'block';
          if (whereUsedRmSuggestDropdown) whereUsedRmSuggestDropdown.style.display = 'none';
          if (wuRmNameMatchBadge) wuRmNameMatchBadge.style.display = 'none';
        }
      });
    }

    if (whereUsedRmNameInput) {
      whereUsedRmNameInput.addEventListener('input', handleRmNameInput);
      whereUsedRmNameInput.addEventListener('focus', () => {
        if (whereUsedRmNameInput.value.trim()) handleRmNameInput();
      });

      whereUsedRmNameInput.addEventListener('keydown', (e) => {
        if (whereUsedRmSuggestDropdown && whereUsedRmSuggestDropdown.style.display !== 'none') {
          const items = whereUsedRmSuggestDropdown.querySelectorAll('.rm-suggest-item');
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            wuRmSuggestActiveIndex = Math.min(wuRmSuggestActiveIndex + 1, items.length - 1);
            items.forEach((it, idx) => it.classList.toggle('active', idx === wuRmSuggestActiveIndex));
            if (items[wuRmSuggestActiveIndex]) items[wuRmSuggestActiveIndex].scrollIntoView({ block: 'nearest' });
            return;
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            wuRmSuggestActiveIndex = Math.max(wuRmSuggestActiveIndex - 1, 0);
            items.forEach((it, idx) => it.classList.toggle('active', idx === wuRmSuggestActiveIndex));
            if (items[wuRmSuggestActiveIndex]) items[wuRmSuggestActiveIndex].scrollIntoView({ block: 'nearest' });
            return;
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (wuRmSuggestActiveIndex >= 0 && wuRmSuggestActiveIndex < wuRmCurrentSuggestions.length) {
              selectRmSuggestion(wuRmSuggestActiveIndex);
            } else if (wuRmCurrentSuggestions.length > 0) {
              selectRmSuggestion(0);
            } else {
              executeWhereUsedFromInputs();
            }
            return;
          } else if (e.key === 'Escape') {
            whereUsedRmSuggestDropdown.style.display = 'none';
            return;
          }
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          executeWhereUsedFromInputs();
        }
      });
    }

    if (btnClearWhereUsedRm) {
      btnClearWhereUsedRm.addEventListener('click', () => {
        if (whereUsedRmCode) whereUsedRmCode.value = '';
        btnClearWhereUsedRm.style.display = 'none';
        if (whereUsedRmCode) whereUsedRmCode.focus();
      });
    }

    if (btnClearWhereUsedRmName) {
      btnClearWhereUsedRmName.addEventListener('click', () => {
        if (whereUsedRmNameInput) whereUsedRmNameInput.value = '';
        btnClearWhereUsedRmName.style.display = 'none';
        if (whereUsedRmSuggestDropdown) whereUsedRmSuggestDropdown.style.display = 'none';
        if (wuRmNameMatchBadge) wuRmNameMatchBadge.style.display = 'none';
        if (whereUsedRmNameInput) whereUsedRmNameInput.focus();
      });
    }

    // Close suggest dropdown on click outside
    document.addEventListener('click', (e) => {
      if (whereUsedRmSuggestDropdown && !whereUsedRmSuggestDropdown.contains(e.target) && e.target !== whereUsedRmNameInput) {
        whereUsedRmSuggestDropdown.style.display = 'none';
      }
    });

    if (btnResetWhereUsed) {
      btnResetWhereUsed.addEventListener('click', () => {
        if (whereUsedRmCode) whereUsedRmCode.value = '';
        if (whereUsedRmNameInput) whereUsedRmNameInput.value = '';
        if (btnClearWhereUsedRm) btnClearWhereUsedRm.style.display = 'none';
        if (btnClearWhereUsedRmName) btnClearWhereUsedRmName.style.display = 'none';
        if (whereUsedRmSuggestDropdown) whereUsedRmSuggestDropdown.style.display = 'none';
        if (wuRmNameMatchBadge) wuRmNameMatchBadge.style.display = 'none';
        if (whereUsedOrgFilter) whereUsedOrgFilter.value = 'ALL';
        if (whereUsedTypeFilter) whereUsedTypeFilter.value = 'ALL';
        if (wuTableSearchInput) wuTableSearchInput.value = '';
        if (whereUsedEmptyPrompt) whereUsedEmptyPrompt.style.display = 'block';
        if (whereUsedResultsSection) whereUsedResultsSection.style.display = 'none';
        whereUsedActiveRm = '';
        whereUsedCurrentRows = [];
        whereUsedFilteredRows = [];
      });
    }

    if (whereUsedOrgFilter) {
      whereUsedOrgFilter.addEventListener('change', () => {
        if (whereUsedActiveRm) applyWhereUsedFilters();
      });
    }

    if (whereUsedTypeFilter) {
      whereUsedTypeFilter.addEventListener('change', () => {
        if (whereUsedActiveRm) applyWhereUsedFilters();
      });
    }

    if (wuPageSizeSelect) {
      wuPageSizeSelect.addEventListener('change', () => {
        whereUsedCurrentPage = 1;
        renderWhereUsedTablePage();
      });
    }

    if (wuTableSearchInput) {
      wuTableSearchInput.addEventListener('input', () => {
        filterAndRenderWhereUsedTable();
      });
    }

    if (btnExportWhereUsedXlsx) {
      btnExportWhereUsedXlsx.addEventListener('click', exportWhereUsedToExcel);
    }

    if (btnExportWhereUsedCsv) {
      btnExportWhereUsedCsv.addEventListener('click', exportWhereUsedToCsv);
    }

    // Toggle Supply Sub-Inventory & Location columns
    let isSubInvLocVisible = false;
    const btnToggleSubInvLoc = document.getElementById('btnToggleSubInvLoc');
    const textToggleSubInvLoc = document.getElementById('textToggleSubInvLoc');
    const iconToggleSubInvLoc = document.getElementById('iconToggleSubInvLoc');
    const whereUsedTable = document.getElementById('whereUsedTable');
    const wuFootColspan = document.getElementById('wuFootColspan');

    if (btnToggleSubInvLoc) {
      btnToggleSubInvLoc.addEventListener('click', () => {
        isSubInvLocVisible = !isSubInvLocVisible;
        if (whereUsedTable) {
          whereUsedTable.classList.toggle('show-subinv-loc', isSubInvLocVisible);
        }
        if (textToggleSubInvLoc) {
          textToggleSubInvLoc.textContent = isSubInvLocVisible ? 'Hide Sub-Inv & Location' : 'Show Sub-Inv & Location';
        }
        if (iconToggleSubInvLoc) {
          iconToggleSubInvLoc.textContent = isSubInvLocVisible ? '🙈' : '👁️';
        }
        if (wuFootColspan) {
          wuFootColspan.colSpan = isSubInvLocVisible ? 12 : 10;
        }
        if (isSubInvLocVisible) {
          btnToggleSubInvLoc.style.background = '#e0f2fe';
          btnToggleSubInvLoc.style.borderColor = '#0284c7';
          btnToggleSubInvLoc.style.color = '#0369a1';
        } else {
          btnToggleSubInvLoc.style.background = '#ffffff';
          btnToggleSubInvLoc.style.borderColor = '#0284c7';
          btnToggleSubInvLoc.style.color = '#0284c7';
        }
      });

      // Check URL param to optionally open with subinv & location visible
      try {
        const wuParams = new URLSearchParams(window.location.search);
        if (wuParams.get('showSubInv') === '1') {
          btnToggleSubInvLoc.click();
        }
      } catch (e) {
        // ignore
      }
    }

    // Sample chips
    document.querySelectorAll('.wu-sample-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rm = btn.getAttribute('data-rm');
        if (whereUsedRmCode) whereUsedRmCode.value = rm;
        runWhereUsedSearch(rm);
      });
    });
  }

  // -------------------------------------------------------------
  // Event Bindings
  // -------------------------------------------------------------
  function bindDeviationEvents() {
    // Mode Switchers
    if (tabBtnDeviation) tabBtnDeviation.addEventListener('click', () => switchView('deviation'));
    if (tabBtnExplorer) tabBtnExplorer.addEventListener('click', () => switchView('explorer'));
    if (btnCompareCurrentModel) {
      btnCompareCurrentModel.addEventListener('click', () => {
        if (!selectedItem) return;
        switchView('deviation');
        devBeforeItemCode.value = selectedItem.ItemCode;
        handleCodeInput('before');
        if (selectedItem.Version) devBeforeVersion.value = selectedItem.Version;
        updateModelInfoDisplay('before');
        cloneBeforeToAfter();
      });
    }

    // Input listeners Before & After
    if (devBeforeItemCode) {
      devBeforeItemCode.addEventListener('input', () => handleCodeInput('before'));
      devBeforeItemCode.addEventListener('change', () => handleCodeInput('before'));
    }
    if (btnClearBeforeCode) {
      btnClearBeforeCode.addEventListener('click', () => {
        devBeforeItemCode.value = '';
        handleCodeInput('before');
        devBeforeItemCode.focus();
      });
    }
    if (devBeforeVersion) {
      devBeforeVersion.addEventListener('change', () => updateModelInfoDisplay('before'));
    }

    if (devAfterItemCode) {
      devAfterItemCode.addEventListener('input', () => handleCodeInput('after'));
      devAfterItemCode.addEventListener('change', () => handleCodeInput('after'));
    }
    if (btnClearAfterCode) {
      btnClearAfterCode.addEventListener('click', () => {
        devAfterItemCode.value = '';
        handleCodeInput('after');
        devAfterItemCode.focus();
      });
    }
    if (devAfterVersion) {
      devAfterVersion.addEventListener('change', () => updateModelInfoDisplay('after'));
    }

    // Helper Buttons
    if (btnActionCompare) btnActionCompare.addEventListener('click', runBOMDeviationAnalysis);
    if (btnSwapBeforeAfter) btnSwapBeforeAfter.addEventListener('click', swapBeforeAfter);
    if (btnCloneBeforeToAfter) btnCloneBeforeToAfter.addEventListener('click', cloneBeforeToAfter);
    if (btnLoadSampleDev) btnLoadSampleDev.addEventListener('click', loadSampleDeviation);
    if (btnClearAllFilters) btnClearAllFilters.addEventListener('click', clearAllFilters);

    // Slicers
    slicerStatusPills.forEach(pill => {
      pill.addEventListener('click', () => {
        slicerStatusPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentDevFilter = pill.getAttribute('data-filter') || 'DIFF';
        renderDeviationTable();
      });
    });

    if (slicerCategory) {
      slicerCategory.addEventListener('change', () => {
        currentCategoryFilter = slicerCategory.value;
        renderDeviationTable();
      });
    }

    if (slicerCost) {
      slicerCost.addEventListener('change', () => {
        currentCostFilter = slicerCost.value;
        renderDeviationTable();
      });
    }

    if (slicerRmGroup) {
      slicerRmGroup.addEventListener('change', () => {
        currentRmGroupFilter = slicerRmGroup.value;
        renderDeviationTable();
      });
    }

    if (btnToggleGroupView) {
      btnToggleGroupView.addEventListener('click', () => {
        isGroupedView = !isGroupedView;
        if (textToggleGroupView) {
          textToggleGroupView.textContent = isGroupedView ? 'Flat Table View' : 'Group by RM Type';
        }
        if (btnToggleGroupView) {
          if (isGroupedView) {
            btnToggleGroupView.style.background = '#2563eb';
            btnToggleGroupView.style.color = '#ffffff';
            btnToggleGroupView.style.borderColor = '#1d4ed8';
          } else {
            btnToggleGroupView.style.background = '#eff6ff';
            btnToggleGroupView.style.color = '#1e40af';
            btnToggleGroupView.style.borderColor = '#93c5fd';
          }
        }
        renderDeviationTable();
      });
    }

    if (filterRmNameDesc) {
      filterRmNameDesc.addEventListener('input', () => {
        const val = filterRmNameDesc.value;
        if (devTableSearch) devTableSearch.value = val;
        if (btnClearRmNameFilter) btnClearRmNameFilter.style.display = val ? 'block' : 'none';
        renderDeviationTable();
      });
    }

    if (btnClearRmNameFilter) {
      btnClearRmNameFilter.addEventListener('click', () => {
        if (filterRmNameDesc) filterRmNameDesc.value = '';
        if (devTableSearch) devTableSearch.value = '';
        btnClearRmNameFilter.style.display = 'none';
        renderDeviationTable();
        if (filterRmNameDesc) filterRmNameDesc.focus();
      });
    }

    if (devTableSearch) {
      devTableSearch.addEventListener('input', () => {
        const val = devTableSearch.value;
        if (filterRmNameDesc) filterRmNameDesc.value = val;
        if (btnClearRmNameFilter) btnClearRmNameFilter.style.display = val ? 'block' : 'none';
        renderDeviationTable();
      });
    }

    if (btnResetSlicers) {
      btnResetSlicers.addEventListener('click', resetSlicers);
    }

    // Exports
    if (btnExportDevExcel) btnExportDevExcel.addEventListener('click', exportDeviationToExcel);
    if (btnExportDevCsv) btnExportDevCsv.addEventListener('click', exportDeviationToCsv);
  }

  function bindEvents() {
    if (searchItemCode) {
      searchItemCode.addEventListener('input', () => {
        updateVersionDropdown();
        applyFilters();
      });
    }

    if (searchVersion) {
      searchVersion.addEventListener('change', () => {
        const selectedVer = (searchVersion.value || '').trim();
        applyFilters(true);

        if (selectedVer) {
          const codeQuery = (searchItemCode ? searchItemCode.value : '').trim().toLowerCase();
          const match = filteredItems.find(it => (it.Version || 'Standard').toLowerCase() === selectedVer.toLowerCase()) ||
                        allItems.find(it => (it.ItemCode || '').toLowerCase() === codeQuery && (it.Version || 'Standard').toLowerCase() === selectedVer.toLowerCase());
          if (match) {
            selectItem(match);
          }
        }
      });
    }

    if (filterOrg) filterOrg.addEventListener('change', applyFilters);
    if (filterCache) filterCache.addEventListener('change', applyFilters);

    if (btnClearItemCode) {
      btnClearItemCode.addEventListener('click', () => {
        searchItemCode.value = '';
        updateVersionDropdown();
        applyFilters();
        searchItemCode.focus();
      });
    }

    if (btnClearVersion) {
      btnClearVersion.addEventListener('click', () => {
        if (searchVersion) searchVersion.value = '';
        applyFilters();
      });
    }

    if (btnResetSearch) {
      btnResetSearch.addEventListener('click', () => {
        if (searchItemCode) searchItemCode.value = '';
        if (searchVersion) {
          searchVersion.innerHTML = '<option value="">-- All Versions --</option>';
          searchVersion.value = '';
        }
        if (filterOrg) filterOrg.value = 'ALL';
        if (filterCache) filterCache.value = 'ALL';
        applyFilters();
      });
    }

    if (btnPrevPage) {
      btnPrevPage.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderCatalogList(); }
      });
    }

    if (btnNextPage) {
      btnNextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredItems.length / pageSize);
        if (currentPage < totalPages) { currentPage++; renderCatalogList(); }
      });
    }

    // Floor Physical Observation Events
    if (txtFloorObsMsg) {
      txtFloorObsMsg.addEventListener('input', updateFloorMsgBadge);
      txtFloorObsMsg.addEventListener('paste', () => setTimeout(updateFloorMsgBadge, 50));
    }

    if (btnLoadSampleFloorMsg) {
      btnLoadSampleFloorMsg.addEventListener('click', loadSampleFloorObservation);
    }

    if (btnClearFloorMsg) {
      btnClearFloorMsg.addEventListener('click', () => {
        if (txtFloorObsMsg) txtFloorObsMsg.value = '';
        updateFloorMsgBadge();
        floorAuditedMap.clear();
        renderBomTable();
        if (floorDeviationReportSection) floorDeviationReportSection.style.display = 'none';
        currentFloorObsData = null;
      });
    }

    if (btnGenerateFloorReport) {
      btnGenerateFloorReport.addEventListener('click', generateFloorDeviationReport);
    }

    if (btnCloseFloorReport) {
      btnCloseFloorReport.addEventListener('click', () => {
        if (floorDeviationReportSection) floorDeviationReportSection.style.display = 'none';
      });
    }

    if (btnExportFloorExcel) {
      btnExportFloorExcel.addEventListener('click', exportFloorReportToExcel);
    }

    if (btnExportFloorCsv) {
      btnExportFloorCsv.addEventListener('click', exportFloorReportToCsv);
    }

    const btnExportFloorHtml = document.getElementById('btnExportFloorHtml');
    if (btnExportFloorHtml) {
      btnExportFloorHtml.addEventListener('click', exportFloorReportToHtml);
    }

    if (floorReportSearch) {
      floorReportSearch.addEventListener('input', renderFloorReportTable);
    }

    const floorSlicerPills = document.querySelectorAll('#floorReportSlicers .slicer-pill');
    floorSlicerPills.forEach(pill => {
      pill.addEventListener('click', () => {
        floorSlicerPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFloorFilter = pill.getAttribute('data-floor-filter') || 'ALL';
        renderFloorReportTable();
      });
    });

    if (btnRunVerification) btnRunVerification.addEventListener('click', runCrossVerification);
    if (inputVerifyRmCode) {
      inputVerifyRmCode.addEventListener('keydown', e => { if (e.key === 'Enter') runCrossVerification(); });
    }
    if (inputPhysicalQty) {
      inputPhysicalQty.addEventListener('keydown', e => { if (e.key === 'Enter') runCrossVerification(); });
    }

    if (btnClearVerification) {
      btnClearVerification.addEventListener('click', () => {
        if (inputVerifyRmCode) inputVerifyRmCode.value = '';
        if (inputPhysicalQty) inputPhysicalQty.value = '';
        if (verifyResultCard) verifyResultCard.style.display = 'none';
        document.querySelectorAll('#bomTableBody tr').forEach(r => r.classList.remove('highlight-found'));
      });
    }

    if (bomTableSearch) {
      bomTableSearch.addEventListener('input', e => renderBomTable(e.target.value));
    }

    if (btnCopyCmd) {
      btnCopyCmd.addEventListener('click', () => {
        const cmd = document.getElementById('cmdFetchScript').innerText;
        navigator.clipboard.writeText(cmd).then(() => {
          btnCopyCmd.textContent = 'Copied!';
          setTimeout(() => { btnCopyCmd.textContent = 'Copy'; }, 2000);
        });
      });
    }

    if (btnExportExcel) btnExportExcel.addEventListener('click', exportSingleExcel);
    if (btnExportCsv) btnExportCsv.addEventListener('click', exportSingleCsv);

    // Related Platform Versions & Concern R&I Email Events
    if (btnCopyRelatedCodes) btnCopyRelatedCodes.addEventListener('click', copyRelatedFgCodes);
    if (btnOpenRiEmailModal) btnOpenRiEmailModal.addEventListener('click', openRiEmailModal);
    if (btnOpenRiEmailTop) btnOpenRiEmailTop.addEventListener('click', openRiEmailModal);

    if (relatedOtherToggleBtn && relatedOtherSiblingsList) {
      relatedOtherToggleBtn.addEventListener('click', () => {
        const isHidden = relatedOtherSiblingsList.style.display === 'none';
        relatedOtherSiblingsList.style.display = isHidden ? 'flex' : 'none';
        const otherCount = currentRelatedData ? currentRelatedData.otherSiblings.length : 0;
        relatedOtherToggleBtn.textContent = isHidden
          ? `▼ Hide other related platform models (${otherCount})`
          : `▶ View ${otherCount} other related platform models (Indoor / Alternative Suffixes)`;
      });
    }

    // Concern R&I Email Modal Events
    if (btnCloseRiEmailModal) btnCloseRiEmailModal.addEventListener('click', closeRiEmailModal);
    if (btnCloseRiEmailModalBottom) btnCloseRiEmailModalBottom.addEventListener('click', closeRiEmailModal);
    if (riEmailModal) {
      riEmailModal.addEventListener('click', (e) => {
        if (e.target === riEmailModal) closeRiEmailModal();
      });
    }

    if (btnCopySubject) {
      btnCopySubject.addEventListener('click', () => {
        if (riEmailSubject) {
          navigator.clipboard.writeText(riEmailSubject.value).then(() => {
            btnCopySubject.textContent = 'Copied!';
            setTimeout(() => { btnCopySubject.textContent = '📋 Copy'; }, 2000);
          });
        }
      });
    }

    if (btnCopyEmailTo) {
      btnCopyEmailTo.addEventListener('click', () => {
        if (riEmailTo) {
          navigator.clipboard.writeText(riEmailTo.value).then(() => {
            btnCopyEmailTo.textContent = 'Copied!';
            setTimeout(() => { btnCopyEmailTo.textContent = '📋 Copy'; }, 2000);
          });
        }
      });
    }

    if (btnCopyEmailCc) {
      btnCopyEmailCc.addEventListener('click', () => {
        if (riEmailCc) {
          navigator.clipboard.writeText(riEmailCc.value).then(() => {
            btnCopyEmailCc.textContent = 'Copied!';
            setTimeout(() => { btnCopyEmailCc.textContent = '📋 Copy'; }, 2000);
          });
        }
      });
    }

    if (btnCopyEmailHtml) btnCopyEmailHtml.addEventListener('click', copyEmailRichHtml);
    if (btnCopyEmailText) btnCopyEmailText.addEventListener('click', copyEmailPlainText);
    const btnDownloadEmailHtml = document.getElementById('btnDownloadEmailHtml');
    if (btnDownloadEmailHtml) btnDownloadEmailHtml.addEventListener('click', downloadEmailReportHtml);
    if (btnOpenInOutlook) btnOpenInOutlook.addEventListener('click', openInOutlookClient);
    if (btnSelectEmailContent) btnSelectEmailContent.addEventListener('click', selectEmailContent);

    // Owners & System Status Modal
    const ownersModal = document.getElementById('ownersModal');
    const btnOwnersStatus = document.getElementById('btnOwnersStatus');
    const btnSyncStatus = document.getElementById('btnSyncStatus');
    const btnCloseOwnersModal = document.getElementById('btnCloseOwnersModal');
    const btnModalClose = document.getElementById('btnModalClose');

    const openOwnersModal = () => { if (ownersModal) ownersModal.classList.add('show'); };
    const closeOwnersModal = () => { if (ownersModal) ownersModal.classList.remove('show'); };

    if (btnOwnersStatus) btnOwnersStatus.addEventListener('click', openOwnersModal);
    if (btnSyncStatus) btnSyncStatus.addEventListener('click', openOwnersModal);
    if (btnCloseOwnersModal) btnCloseOwnersModal.addEventListener('click', closeOwnersModal);
    if (btnModalClose) btnModalClose.addEventListener('click', closeOwnersModal);
    if (ownersModal) {
      ownersModal.addEventListener('click', (e) => {
        if (e.target === ownersModal) closeOwnersModal();
      });
    }
  }

  // -------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatNum(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }

  // -------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
