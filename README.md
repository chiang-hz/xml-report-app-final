# XML Report Analyzer

一個用於上傳中央銀行損益表 XML 檔案並視覺化分析的前端網站。

## 功能

- 上傳多個 XML 損益表檔案
- 年度區間選擇
- 科目分類篩選（含多選與分組）
- 金額單位轉換（元、千元、億元）
- 表格 + 趨勢圖顯示
- 匯出為 Excel 檔案

## 使用技術

- React + Vite
- Recharts 圖表
- XLSX 匯出
- TailwindCSS（class 寫法）
- 部署於 Vercel

## 開發與部署

```bash
npm install
npm run dev
```

### 建置與部署
```bash
npm run build
npx vite preview
```

👉 可直接部署於 [Vercel](https://vercel.com)
