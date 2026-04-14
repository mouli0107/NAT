const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../public/samples');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sourceData = [
  { PolicyNumber: 'ABC-2024-001', CustomerName: 'John Smith', PolicyType: 'Auto Insurance', Premium: 1250.00, StartDate: '2024-01-15', EndDate: '2025-01-15', Status: 'Active', AgentID: 'AGT001', Region: 'Northeast', ClaimCount: 0 },
  { PolicyNumber: 'ABC-2024-002', CustomerName: 'Sarah Johnson', PolicyType: 'Home Insurance', Premium: 2100.50, StartDate: '2024-02-01', EndDate: '2025-02-01', Status: 'Active', AgentID: 'AGT002', Region: 'Southeast', ClaimCount: 1 },
  { PolicyNumber: 'ABC-2024-003', CustomerName: 'Michael Brown', PolicyType: 'Life Insurance', Premium: 850.00, StartDate: '2024-01-20', EndDate: '2034-01-20', Status: 'Active', AgentID: 'AGT001', Region: 'Northeast', ClaimCount: 0 },
  { PolicyNumber: 'ABC-2024-004', CustomerName: 'Emily Davis', PolicyType: 'Auto Insurance', Premium: 1450.75, StartDate: '2024-03-01', EndDate: '2025-03-01', Status: 'Active', AgentID: 'AGT003', Region: 'West', ClaimCount: 2 },
  { PolicyNumber: 'ABC-2024-005', CustomerName: 'Robert Wilson', PolicyType: 'Home Insurance', Premium: 1875.25, StartDate: '2024-02-15', EndDate: '2025-02-15', Status: 'Pending', AgentID: 'AGT002', Region: 'Southeast', ClaimCount: 0 },
  { PolicyNumber: 'ABC-2024-006', CustomerName: 'Jennifer Taylor', PolicyType: 'Auto Insurance', Premium: 1100.00, StartDate: '2024-04-01', EndDate: '2025-04-01', Status: 'Active', AgentID: 'AGT004', Region: 'Midwest', ClaimCount: 1 },
  { PolicyNumber: 'ABC-2024-007', CustomerName: 'David Anderson', PolicyType: 'Life Insurance', Premium: 950.50, StartDate: '2024-03-15', EndDate: '2034-03-15', Status: 'Active', AgentID: 'AGT001', Region: 'Northeast', ClaimCount: 0 },
  { PolicyNumber: 'ABC-2024-008', CustomerName: 'Lisa Martinez', PolicyType: 'Health Insurance', Premium: 3200.00, StartDate: '2024-01-01', EndDate: '2025-01-01', Status: 'Active', AgentID: 'AGT005', Region: 'Southwest', ClaimCount: 3 },
  { PolicyNumber: 'ABC-2024-009', CustomerName: 'James Garcia', PolicyType: 'Auto Insurance', Premium: 1325.00, StartDate: '2024-04-15', EndDate: '2025-04-15', Status: 'Active', AgentID: 'AGT003', Region: 'West', ClaimCount: 0 },
  { PolicyNumber: 'ABC-2024-010', CustomerName: 'Patricia Rodriguez', PolicyType: 'Home Insurance', Premium: 2250.75, StartDate: '2024-05-01', EndDate: '2025-05-01', Status: 'Active', AgentID: 'AGT004', Region: 'Midwest', ClaimCount: 1 },
  { PolicyNumber: 'ABC-2024-011', CustomerName: 'Charles Lee', PolicyType: 'Life Insurance', Premium: 1050.00, StartDate: '2024-02-20', EndDate: '2034-02-20', Status: 'Active', AgentID: 'AGT002', Region: 'Southeast', ClaimCount: 0 },
  { PolicyNumber: 'ABC-2024-012', CustomerName: 'Nancy White', PolicyType: 'Health Insurance', Premium: 2800.50, StartDate: '2024-03-01', EndDate: '2025-03-01', Status: 'Cancelled', AgentID: 'AGT005', Region: 'Southwest', ClaimCount: 2 }
];

const targetData = sourceData.map((row, idx) => {
  const newRow = { ...row };
  
  if (idx === 1) newRow.Premium = 2100.52;
  if (idx === 3) newRow.Premium = 1450.80;
  if (idx === 4) newRow.Status = 'Active';
  if (idx === 7) newRow.ClaimCount = 4;
  if (idx === 9) newRow.Premium = 2250.00;
  if (idx === 11) newRow.Status = 'Expired';
  
  return newRow;
});

function generateExcelFiles() {
  console.log('Generating Excel files...');
  
  const sourceWB = XLSX.utils.book_new();
  const sourceWS = XLSX.utils.json_to_sheet(sourceData);
  XLSX.utils.book_append_sheet(sourceWB, sourceWS, 'Policy Report');
  XLSX.writeFile(sourceWB, path.join(outputDir, 'ABC_Insurance_SSRS_Report.xlsx'));
  console.log('Created: ABC_Insurance_SSRS_Report.xlsx');
  
  const targetWB = XLSX.utils.book_new();
  const targetWS = XLSX.utils.json_to_sheet(targetData);
  XLSX.utils.book_append_sheet(targetWB, targetWS, 'Policy Report');
  XLSX.writeFile(targetWB, path.join(outputDir, 'ABC_Insurance_PowerBI_Report.xlsx'));
  console.log('Created: ABC_Insurance_PowerBI_Report.xlsx');
}

function generatePDFFile(data, filename, reportType) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'LETTER', layout: 'landscape' });
    const stream = fs.createWriteStream(path.join(outputDir, filename));
    
    doc.pipe(stream);
    
    doc.fontSize(18).font('Helvetica-Bold').text('ABC INSURANCE COMPANY', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(14).font('Helvetica').text(`Policy Summary Report - ${reportType}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
    doc.moveDown(1);
    
    const headers = ['Policy #', 'Customer', 'Type', 'Premium', 'Start', 'End', 'Status', 'Agent', 'Region', 'Claims'];
    const colWidths = [80, 100, 80, 60, 70, 70, 55, 50, 65, 45];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const startX = (doc.page.width - tableWidth) / 2;
    let y = doc.y;
    
    doc.font('Helvetica-Bold').fontSize(8);
    let x = startX;
    doc.rect(startX, y, tableWidth, 18).fill('#2563eb');
    doc.fillColor('#ffffff');
    headers.forEach((header, i) => {
      doc.text(header, x + 3, y + 5, { width: colWidths[i] - 6, align: 'left' });
      x += colWidths[i];
    });
    y += 20;
    doc.fillColor('#000000');
    
    doc.font('Helvetica').fontSize(7);
    data.forEach((row, rowIdx) => {
      if (y > doc.page.height - 60) {
        doc.addPage({ margin: 40, size: 'LETTER', layout: 'landscape' });
        y = 50;
      }
      
      const bgColor = rowIdx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(startX, y, tableWidth, 16).fill(bgColor);
      doc.fillColor('#000000');
      
      x = startX;
      const values = [
        row.PolicyNumber,
        row.CustomerName,
        row.PolicyType.replace(' Insurance', ''),
        `$${row.Premium.toFixed(2)}`,
        row.StartDate,
        row.EndDate,
        row.Status,
        row.AgentID,
        row.Region,
        row.ClaimCount.toString()
      ];
      
      values.forEach((val, i) => {
        doc.text(val, x + 3, y + 4, { width: colWidths[i] - 6, align: i === 3 ? 'right' : 'left' });
        x += colWidths[i];
      });
      y += 16;
    });
    
    y += 20;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Summary Statistics', startX, y);
    y += 15;
    doc.font('Helvetica').fontSize(9);
    
    const totalPremium = data.reduce((sum, r) => sum + r.Premium, 0);
    const activeCount = data.filter(r => r.Status === 'Active').length;
    const totalClaims = data.reduce((sum, r) => sum + r.ClaimCount, 0);
    
    doc.text(`Total Policies: ${data.length}`, startX, y);
    doc.text(`Active Policies: ${activeCount}`, startX + 150, y);
    doc.text(`Total Premium: $${totalPremium.toFixed(2)}`, startX + 300, y);
    doc.text(`Total Claims: ${totalClaims}`, startX + 480, y);
    
    doc.end();
    
    stream.on('finish', () => {
      console.log(`Created: ${filename}`);
      resolve();
    });
    stream.on('error', reject);
  });
}

async function generatePDFFiles() {
  console.log('Generating PDF files...');
  await generatePDFFile(sourceData, 'ABC_Insurance_SSRS_Report.pdf', 'SSRS Export');
  await generatePDFFile(targetData, 'ABC_Insurance_PowerBI_Report.pdf', 'PowerBI Export');
}

async function main() {
  console.log('=== ABC Insurance Sample File Generator ===\n');
  console.log(`Output directory: ${outputDir}\n`);
  
  generateExcelFiles();
  await generatePDFFiles();
  
  console.log('\n=== Generation Complete ===');
  console.log('\nFiles created:');
  console.log('  Excel (Source): ABC_Insurance_SSRS_Report.xlsx');
  console.log('  Excel (Target): ABC_Insurance_PowerBI_Report.xlsx');
  console.log('  PDF (Source):   ABC_Insurance_SSRS_Report.pdf');
  console.log('  PDF (Target):   ABC_Insurance_PowerBI_Report.pdf');
  console.log('\nDifferences introduced in target files:');
  console.log('  - Row 2: Premium differs by $0.02 (2100.50 vs 2100.52)');
  console.log('  - Row 4: Premium differs by $0.05 (1450.75 vs 1450.80)');
  console.log('  - Row 5: Status changed (Pending vs Active)');
  console.log('  - Row 8: Claim count differs (3 vs 4)');
  console.log('  - Row 10: Premium differs by $0.75 (2250.75 vs 2250.00)');
  console.log('  - Row 12: Status changed (Cancelled vs Expired)');
}

main().catch(console.error);
