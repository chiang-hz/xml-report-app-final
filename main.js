
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm";

const root = document.getElementById("root");
root.innerHTML = `
  <h1 class="text-2xl font-bold mb-4">📤 上傳損益表 XML 並產生報表</h1>
  <input id="xml-upload" type="file" accept=".xml" multiple class="mb-4 border px-2 py-1 rounded" />
  <div id="controls" class="grid gap-4 hidden">
    <div class="flex gap-4 items-center flex-wrap">
      <div class="flex gap-2 items-center">
        <label class="text-sm font-medium">年度區間：</label>
        <select id="start-year" class="border px-2 py-1 rounded"></select>
        <span>~</span>
        <select id="end-year" class="border px-2 py-1 rounded"></select>
      </div>
      <div class="flex flex-col">
        <label class="text-sm font-medium">篩選科目：</label>
        <select id="subject-filter" multiple class="border px-2 py-1 rounded w-64 h-32"></select>
      </div>
      <div class="flex gap-2 items-center">
        <label class="text-sm font-medium">金額單位：</label>
        <select id="unit-select" class="border px-2 py-1 rounded">
          <option value="1">元</option>
          <option value="1000">千元</option>
          <option value="100000000">億元</option>
        </select>
      </div>
      <button id="export-btn" class="ml-auto border px-3 py-1 rounded hover:bg-gray-100 flex gap-1 items-center">⬇️ 匯出 Excel</button>
    </div>
    <div class="overflow-x-auto mt-4" id="report-table"></div>
    <canvas id="report-chart" class="w-full h-96"></canvas>
  </div>
`;

const dataByYear = {};
let yearList = [];
let subjectList = [];

document.getElementById("xml-upload").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  const parser = new DOMParser();
  const yearSet = new Set();
  const subjectSet = new Set();

  for (const file of files) {
    const text = await file.text();
    const xml = parser.parseFromString(text, "text/xml");
    const rows = Array.from(xml.getElementsByTagName("ROW"));
    const year = xml.querySelector("年度")?.textContent || file.name.match(/\d{3,4}/)?.[0] || "未知";

    if (!dataByYear[year]) dataByYear[year] = [];

    rows.forEach((row) => {
      const subject = row.querySelector("科目名稱")?.textContent || "未知科目";
      const final = parseFloat(row.querySelector("本年度決算數")?.textContent || 0);
      const budget = parseFloat(row.querySelector("本年度預算數")?.textContent || 0);
      const growth = parseFloat(row.querySelector("比較增減-百分比")?.textContent || 0);
      dataByYear[year].push({ year, subject, final, budget, growth });
      subjectSet.add(subject);
    });
    yearSet.add(year);
  }

  yearList = Array.from(yearSet).sort();
  subjectList = Array.from(subjectSet);

  populateControls();
  document.getElementById("controls").classList.remove("hidden");
  renderTable();
  renderChart();
});

function populateControls() {
  const startSel = document.getElementById("start-year");
  const endSel = document.getElementById("end-year");
  startSel.innerHTML = endSel.innerHTML = yearList.map((y) => `<option value="${y}">${y}</option>`).join("");
  startSel.value = yearList[0];
  endSel.value = yearList[yearList.length - 1];

  const subjSel = document.getElementById("subject-filter");
  subjSel.innerHTML = `<option value="__ALL__">全部科目</option>` + subjectList.map((s) => `<option value="${s}">${s}</option>`).join("");

  ["start-year", "end-year", "subject-filter", "unit-select"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      renderTable();
      renderChart();
    });
  });

  document.getElementById("export-btn").addEventListener("click", () => {
    const table = document.querySelector("#report-table table");
    const wb = XLSX.utils.table_to_book(table, { sheet: "損益表" });
    XLSX.writeFile(wb, `報表_${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
}

function getFilteredData() {
  const start = document.getElementById("start-year").value;
  const end = document.getElementById("end-year").value;
  const selected = Array.from(document.getElementById("subject-filter").selectedOptions).map(o => o.value);
  const allYears = yearList.filter((y) => y >= start && y <= end);
  const allRows = allYears.flatMap((y) => dataByYear[y]);
  return selected.includes("__ALL__") ? allRows : allRows.filter((r) => selected.includes(r.subject));
}

function renderTable() {
  const unit = parseInt(document.getElementById("unit-select").value);
  const rows = getFilteredData();

  let html = `<table class="min-w-full text-sm border"><thead><tr class="bg-gray-100">
    <th class="border px-2 py-1">年度</th>
    <th class="border px-2 py-1">科目</th>
    <th class="border px-2 py-1">決算</th>
    <th class="border px-2 py-1">預算</th>
    <th class="border px-2 py-1">增減%</th></tr></thead><tbody>`;

  rows.forEach(r => {
    html += `<tr><td class="border px-2 py-1 text-center">${r.year}</td>
      <td class="border px-2 py-1">${r.subject}</td>
      <td class="border px-2 py-1 text-right">${(r.final / unit).toLocaleString()}</td>
      <td class="border px-2 py-1 text-right">${(r.budget / unit).toLocaleString()}</td>
      <td class="border px-2 py-1 text-right">${r.growth.toFixed(2)}%</td></tr>`;
  });

  html += "</tbody></table>";
  document.getElementById("report-table").innerHTML = html;
}

function renderChart() {
  const ctx = document.getElementById("report-chart").getContext("2d");
  if (window.chartInstance) window.chartInstance.destroy();

  const unit = parseInt(document.getElementById("unit-select").value);
  const start = document.getElementById("start-year").value;
  const end = document.getElementById("end-year").value;
  const selected = Array.from(document.getElementById("subject-filter").selectedOptions).map(o => o.value);
  const allYears = yearList.filter((y) => y >= start && y <= end);
  const filtered = getFilteredData();

  const subjects = [...new Set(filtered.map(f => f.subject))];
  const dataMap = {};
  subjects.forEach(s => dataMap[s] = {});
  filtered.forEach(row => dataMap[row.subject][row.year] = row.final / unit);

  const datasets = subjects.map((s, i) => ({
    label: s,
    data: allYears.map(y => dataMap[s][y] || 0),
    borderColor: `hsl(${(i * 47) % 360}, 70%, 50%)`,
    fill: false,
  }));

  window.chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: allYears, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: '跨年度科目趨勢圖' }
      }
    }
  });
}
