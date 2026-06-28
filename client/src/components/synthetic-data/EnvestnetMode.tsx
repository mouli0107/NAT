import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Download, FileText, CheckCircle2, AlertTriangle, Zap, Info, ChevronDown, ChevronRight,
} from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────

const FILE_TYPES = [
  {
    id: "csh",
    label: "SAL_CSH",
    fullName: "Transaction / Cash Entry",
    table: "account_transaction",
    sourceCodes: ["WTFEE", "JRL", "STAX", "RDIV", "YRINC", "WRAP", "RPRM"],
    colNote: "Variable column count per SOURCE_CODE (45–58 cols, pipe-delimited)",
    available: true,
  },
  { id: "trd",    label: "SAL_TRD_OSI",      fullName: "Trade / Order",              table: "account_transaction",       sourceCodes: [], colNote: "Coming soon", available: false },
  { id: "rad",    label: "SAL_RAD",           fullName: "Realized Gain/Loss",         table: "account_transaction",       sourceCodes: [], colNote: "Coming soon", available: false },
  { id: "bal",    label: "SAL_BAL_ACTUAL",    fullName: "Balances / Positions",       table: "upload_position",           sourceCodes: [], colNote: "Coming soon", available: false },
  { id: "taxlot", label: "SAL_TAXLOT",        fullName: "Cost Basis / Tax Lots",      table: "upload_lot_position",       sourceCodes: [], colNote: "Coming soon", available: false },
  { id: "sec",    label: "SAL_SEC1_OSI",      fullName: "Security Prices",            table: "security_price_current2",   sourceCodes: [], colNote: "Coming soon", available: false },
  { id: "act",    label: "SAL_ACT",           fullName: "Account / Customer",         table: "account / customer",        sourceCodes: [], colNote: "Coming soon", available: false },
];

const SOURCE_CODE_INFO: Record<string, { desc: string; hasSecurity: boolean; cols: number }> = {
  WTFEE: { desc: "Wire transfer fee",           hasSecurity: false, cols: 58 },
  JRL:   { desc: "Journal / inter-acct transfer", hasSecurity: false, cols: 47 },
  STAX:  { desc: "Foreign tax withholding",     hasSecurity: true,  cols: 48 },
  RDIV:  { desc: "Reinvested dividend",         hasSecurity: true,  cols: 45 },
  YRINC: { desc: "Dividends and interest",      hasSecurity: false, cols: 49 },
  WRAP:  { desc: "Management / wrap fee",       hasSecurity: false, cols: 51 },
  RPRM:  { desc: "Premium distribution",        hasSecurity: false, cols: 48 },
};

// Position catalog — verified vs actual Sal_csh.txt; types from CSH Documentation.pdf (EXCSHY2K)
type CatalogEntry = {
  idx: number;
  field: string;
  type?: string;   // data type from PDF
  len?: string;    // max length / precision
  note?: string;
  blank?: boolean; // filler / unused position
};

const COMMON_COLS: CatalogEntry[] = [
  { idx: 0, field: "BA_RECCODE",  type: "CHAR",    len: "1",    note: "A=Add  C=Change  V=Void" },
  { idx: 1, field: "FIRM_NO",     type: "INTEGER", len: "3",    note: "BETA-assigned firm: 1|5|9|18" },
  { idx: 2, field: "SUB_NO",      type: "INTEGER", len: "3",    note: "Subsidiary number within firm" },
  { idx: 3, field: "ACCT_NO",     type: "INTEGER", len: "9",    note: "Mandatory, max 9 digits" },
  { idx: 4, field: "ACCT_CLASS",  type: "CHAR",    len: "4",    note: "CAPM or blank" },
  { idx: 5, field: "ACCT_TYPE",   type: "INTEGER", len: "1",    note: "1=Cash  2=Margin  3–9=other" },
  { idx: 6, field: "REP",         type: "CHAR",    len: "4",    note: "Registered representative code" },
  { idx: 7, field: "SEC_NO",      type: "INTEGER", len: "9",    note: "BETA internal security number; 0 for fee/journal types" },
];

const SOURCE_COLS: Record<string, { totalCols: number; rows: CatalogEntry[] }> = {
  WTFEE: { totalCols: 58, rows: [
    { idx: 8,  field: "CUSIP",       type: "CHAR",    len: "12",   blank: true, note: "Blank — no security" },
    { idx: 9,  field: "SEC_TYPE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 10, field: "CLASS",       type: "CHAR",    len: "1",    blank: true },
    { idx: 11, field: "SYMBOL",      type: "CHAR",    len: "10",   blank: true },
    { idx: 12, field: "MGN_CODE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 13, field: "STD_INST",    type: "CHAR",    len: "2",    blank: true },
    { idx: 14, field: "«filler»",    blank: true },
    { idx: 15, field: "«filler»",    blank: true },
    { idx: 16, field: "«filler»",    blank: true },
    { idx: 17, field: "«filler»",    blank: true },
    { idx: 18, field: "TRADE_DATE",  type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 19, field: "ASOF_CYMD",   type: "CHAR",    len: "10",   blank: true },
    { idx: 20, field: "SETTLE_DATE", type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 21, field: "ORIGIN",      type: "CHAR",    len: "5",    blank: true },
    { idx: 22, field: "LOT_DATE",    type: "CHAR",    len: "10",   note: "Next year's date" },
    { idx: 23, field: "TRAN_RID",    type: "CHAR",    len: "23",   blank: true },
    { idx: 24, field: "CONTROL_NO",  type: "INTEGER", len: "7",    note: "0" },
    { idx: 25, field: "BIG_QTY",     type: "DEC",     len: "15,5", note: "0.00000 for fees" },
    { idx: 26, field: "NET_PRICE",   type: "DEC",     len: "15,5", note: "0.00000" },
    { idx: 27, field: "SOURCE_CODE", type: "CHAR",    len: "5",    note: "= WTFEE" },
    { idx: 28, field: "PURCH_OR_SALE",type:"CHAR",    len: "1",    blank: true },
    { idx: 29, field: "ACCRUED_INT", type: "DEC",     len: "13,2", note: "0" },
    { idx: 30, field: "NET_AMT",     type: "DEC",     len: "13,2", note: "Fee amount (PRINCIPAL)" },
    { idx: 31, field: "OFFSET_ACCT", type: "INTEGER", len: "9",    blank: true },
    { idx: 32, field: "OFFSET_TYPE", type: "INTEGER", len: "1",    blank: true },
    { idx: 33, field: "NO_CREDIT",   type: "CHAR",    len: "1",    blank: true },
    { idx: 34, field: "USER_FIELD",  type: "INTEGER", len: "5",    blank: true },
    { idx: 35, field: "TAG_NO",      type: "DEC",     len: "11,0", blank: true },
    { idx: 36, field: "DESC1",       type: "CHAR",    len: "24",   note: "e.g. WIRE TRANSFER FEE" },
    { idx: 37, field: "DESC2",       type: "CHAR",    len: "24",   blank: true },
    { idx: 38, field: "DESC3",       type: "CHAR",    len: "24",   blank: true },
    { idx: 39, field: "DESC4",       type: "CHAR",    len: "24",   blank: true },
    { idx: 40, field: "DESC5",       type: "CHAR",    len: "24",   blank: true },
    { idx: 41, field: "DESC6",       type: "CHAR",    len: "24",   blank: true },
    { idx: 42, field: "MLP_CODE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 43, field: "DIV_REINV",   type: "CHAR",    len: "1",    blank: true },
    { idx: 44, field: "BOND_TYPE",   type: "CHAR",    len: "2",    blank: true },
    { idx: 45, field: "TAX_ID",      type: "INTEGER", len: "9",    blank: true },
    { idx: 46, field: "PROGRAM_NO",  type: "INTEGER", len: "8",    blank: true },
    { idx: 47, field: "PAY_CURR",    type: "CHAR",    len: "1",    blank: true },
    { idx: 48, field: "COUNTRY_CODE",type: "CHAR",    len: "4",    blank: true },
    { idx: 49, field: "ADJUST_SW",   type: "CHAR",    len: "1",    note: "N=not reversal  Y=reversal" },
    { idx: 50, field: "BROKER_NO",   type: "INTEGER", len: "5",    note: "e.g. 22298" },
    { idx: 51, field: "NONCUST_SW",  type: "CHAR",    len: "1",    blank: true },
    { idx: 52, field: "REINVEST_SW", type: "CHAR",    len: "1",    note: "N or blank" },
    { idx: 53, field: "FREE_CREDIT", type: "CHAR",    len: "1",    note: "Y=free credit" },
    { idx: 54, field: "REC_TYPE",    type: "CHAR",    len: "1",    note: "C=cash  D=dividend" },
    { idx: 55, field: "STATUS",      type: "CHAR",    len: "1",    note: "E=exchange/fee" },
    { idx: 56, field: "BATCH_JOB",   type: "CHAR",    len: "8",    blank: true },
    { idx: 57, field: "CHANGE_TMS",  type: "CHAR",    len: "26",   note: "M/D/YYYY H:MM:SS AM/PM" },
  ]},
  JRL: { totalCols: 47, rows: [
    { idx: 8,  field: "CUSIP",       type: "CHAR",    len: "12",   blank: true },
    { idx: 9,  field: "SEC_TYPE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 10, field: "CLASS",       type: "CHAR",    len: "1",    blank: true },
    { idx: 11, field: "SYMBOL",      type: "CHAR",    len: "10",   blank: true },
    { idx: 12, field: "MGN_CODE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 13, field: "STD_INST",    type: "CHAR",    len: "2",    blank: true },
    { idx: 14, field: "«filler»",    blank: true },
    { idx: 15, field: "TRADE_DATE",  type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 16, field: "ASOF_CYMD",   type: "CHAR",    len: "10",   blank: true },
    { idx: 17, field: "SETTLE_DATE", type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 18, field: "ORIGIN",      type: "CHAR",    len: "5",    blank: true },
    { idx: 19, field: "TRAN_RID",    type: "CHAR",    len: "23",   blank: true },
    { idx: 20, field: "CONTROL_NO",  type: "INTEGER", len: "7",    note: "0" },
    { idx: 21, field: "SOURCE_CODE", type: "CHAR",    len: "5",    note: "= JRL" },
    { idx: 22, field: "PURCH_OR_SALE",type:"CHAR",    len: "1",    blank: true },
    { idx: 23, field: "ACCRUED_INT", type: "DEC",     len: "13,2", note: "0" },
    { idx: 24, field: "NET_AMT",     type: "DEC",     len: "13,2", note: "Negative = incoming transfer" },
    { idx: 25, field: "OFFSET_ACCT", type: "INTEGER", len: "9",    blank: true },
    { idx: 26, field: "OFFSET_TYPE", type: "INTEGER", len: "1",    blank: true },
    { idx: 27, field: "NO_CREDIT",   type: "CHAR",    len: "1",    blank: true },
    { idx: 28, field: "USER_FIELD",  type: "INTEGER", len: "5",    blank: true },
    { idx: 29, field: "TAG_NO",      type: "DEC",     len: "11,0", blank: true },
    { idx: 30, field: "DESC1",       type: "CHAR",    len: "24",   note: "Journal description" },
    { idx: 31, field: "DESC2",       type: "CHAR",    len: "24",   blank: true },
    { idx: 32, field: "DESC3",       type: "CHAR",    len: "24",   blank: true },
    { idx: 33, field: "DESC4",       type: "CHAR",    len: "24",   blank: true },
    { idx: 34, field: "DESC5",       type: "CHAR",    len: "24",   blank: true },
    { idx: 35, field: "DESC6",       type: "CHAR",    len: "24",   blank: true },
    { idx: 36, field: "ADJUST_SW",   type: "CHAR",    len: "1",    note: "N or Y" },
    { idx: 37, field: "CROSS_REF",   type: "INTEGER", len: "9",    note: "Internal cross-reference ID" },
    { idx: 38, field: "BROKER_NO",   type: "INTEGER", len: "5",    note: "typically 22202" },
    { idx: 39, field: "REINVEST_SW", type: "CHAR",    len: "1",    note: "N" },
    { idx: 40, field: "FREE_CREDIT", type: "CHAR",    len: "1",    note: "Y" },
    { idx: 41, field: "REC_TYPE",    type: "CHAR",    len: "1",    note: "C=cash" },
    { idx: 42, field: "STATUS",      type: "CHAR",    len: "1",    blank: true },
    { idx: 43, field: "BATCH_JOB",   type: "CHAR",    len: "8",    blank: true },
    { idx: 44, field: "STATE_CODE",  type: "CHAR",    len: "2",    blank: true },
    { idx: 45, field: "BANK_NO",     type: "INTEGER", len: "5",    blank: true },
    { idx: 46, field: "CHANGE_TMS",  type: "CHAR",    len: "26",   note: "M/D/YYYY H:MM:SS AM/PM" },
  ]},
  STAX: { totalCols: 48, rows: [
    { idx: 8,  field: "CUSIP",       type: "CHAR",    len: "12",   blank: true },
    { idx: 9,  field: "SEC_TYPE",    type: "CHAR",    len: "1",    note: "C=Common Stock" },
    { idx: 10, field: "CLASS",       type: "CHAR",    len: "1",    blank: true },
    { idx: 11, field: "SYMBOL",      type: "CHAR",    len: "10",   blank: true },
    { idx: 12, field: "MGN_CODE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 13, field: "TRADE_DATE",  type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 14, field: "ASOF_CYMD",   type: "CHAR",    len: "10",   blank: true },
    { idx: 15, field: "SETTLE_DATE", type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 16, field: "ORIGIN",      type: "CHAR",    len: "5",    blank: true },
    { idx: 17, field: "JULIAN_LOT",  type: "INTEGER", len: "9",    note: "Julian lot date ~40126" },
    { idx: 18, field: "CONTROL_NO",  type: "INTEGER", len: "7",    note: "0" },
    { idx: 19, field: "SOURCE_CODE", type: "CHAR",    len: "5",    note: "= STAX" },
    { idx: 20, field: "PURCH_OR_SALE",type:"CHAR",    len: "1",    blank: true },
    { idx: 21, field: "ACCRUED_INT", type: "DEC",     len: "13,2", note: "0" },
    { idx: 22, field: "NET_AMT",     type: "DEC",     len: "13,2", note: "Tax withholding amount" },
    { idx: 23, field: "OFFSET_ACCT", type: "INTEGER", len: "9",    blank: true },
    { idx: 24, field: "OFFSET_TYPE", type: "INTEGER", len: "1",    blank: true },
    { idx: 25, field: "NO_CREDIT",   type: "CHAR",    len: "1",    blank: true },
    { idx: 26, field: "TAX_REF",     type: "INTEGER", len: "5",    note: "Internal tax reference" },
    { idx: 27, field: "TAG_NO",      type: "DEC",     len: "11,0", note: "0" },
    { idx: 28, field: "CRNCY_TYPE",  type: "INTEGER", len: "5",    note: "0=USD" },
    { idx: 29, field: "BROKER_NO",   type: "INTEGER", len: "5",    blank: true },
    { idx: 30, field: "DESC1",       type: "CHAR",    len: "24",   note: "e.g. FRGN-W/H @ SOURCE" },
    { idx: 31, field: "DESC2",       type: "CHAR",    len: "24",   note: "Security name" },
    { idx: 32, field: "DESC3",       type: "CHAR",    len: "24",   blank: true },
    { idx: 33, field: "DESC4",       type: "CHAR",    len: "24",   blank: true },
    { idx: 34, field: "DESC5",       type: "CHAR",    len: "24",   blank: true },
    { idx: 35, field: "DESC6",       type: "CHAR",    len: "24",   blank: true },
    { idx: 36, field: "MLP_CODE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 37, field: "CR_FLAG",     type: "CHAR",    len: "1",    note: "C=credit  R=debit" },
    { idx: 38, field: "ADJUST_SW",   type: "CHAR",    len: "1",    note: "N or Y" },
    { idx: 39, field: "BROKER_NO",   type: "INTEGER", len: "5",    note: "24020 or 35025" },
    { idx: 40, field: "REINVEST_SW", type: "CHAR",    len: "1",    note: "N" },
    { idx: 41, field: "FREE_CREDIT", type: "CHAR",    len: "1",    note: "Y" },
    { idx: 42, field: "REC_TYPE",    type: "CHAR",    len: "1",    note: "C=cash" },
    { idx: 43, field: "STATUS",      type: "CHAR",    len: "1",    blank: true },
    { idx: 44, field: "BATCH_JOB",   type: "CHAR",    len: "8",    blank: true },
    { idx: 45, field: "STATE_CODE",  type: "CHAR",    len: "2",    blank: true },
    { idx: 46, field: "BANK_NO",     type: "INTEGER", len: "5",    blank: true },
    { idx: 47, field: "CHANGE_TMS",  type: "CHAR",    len: "26",   note: "M/D/YYYY H:MM:SS AM/PM" },
  ]},
  RDIV: { totalCols: 45, rows: [
    { idx: 8,  field: "CUSIP",       type: "CHAR",    len: "12",   blank: true },
    { idx: 9,  field: "SEC_TYPE",    type: "CHAR",    len: "1",    note: "F=Open-ended Fund" },
    { idx: 10, field: "CLASS",       type: "CHAR",    len: "1",    blank: true },
    { idx: 11, field: "SYMBOL",      type: "CHAR",    len: "10",   blank: true },
    { idx: 12, field: "MGN_CODE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 13, field: "TRADE_DATE",  type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 14, field: "ASOF_CYMD",   type: "CHAR",    len: "10",   blank: true },
    { idx: 15, field: "SETTLE_DATE", type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 16, field: "ORIGIN",      type: "CHAR",    len: "5",    blank: true },
    { idx: 17, field: "JULIAN_LOT",  type: "INTEGER", len: "9",    note: "Julian lot date ~33126" },
    { idx: 18, field: "CONTROL_NO",  type: "INTEGER", len: "7",    note: "0" },
    { idx: 19, field: "SOURCE_CODE", type: "CHAR",    len: "5",    note: "= RDIV" },
    { idx: 20, field: "PURCH_OR_SALE",type:"CHAR",    len: "1",    blank: true },
    { idx: 21, field: "ACCRUED_INT", type: "DEC",     len: "13,2", note: "0" },
    { idx: 22, field: "NET_AMT",     type: "DEC",     len: "13,2", note: "Reinvested dividend amount" },
    { idx: 23, field: "OFFSET_ACCT", type: "INTEGER", len: "9",    blank: true },
    { idx: 24, field: "OFFSET_TYPE", type: "INTEGER", len: "1",    blank: true },
    { idx: 25, field: "NO_CREDIT",   type: "CHAR",    len: "1",    blank: true },
    { idx: 26, field: "USER_FIELD",  type: "INTEGER", len: "5",    blank: true },
    { idx: 27, field: "TAG_NO",      type: "DEC",     len: "11,0", blank: true },
    { idx: 28, field: "DESC1",       type: "CHAR",    len: "24",   note: "Fund name part 1" },
    { idx: 29, field: "DESC2",       type: "CHAR",    len: "24",   note: "Fund name part 2" },
    { idx: 30, field: "DESC3",       type: "CHAR",    len: "24",   note: "REINVEST TO OTHER FUND" },
    { idx: 31, field: "DESC4",       type: "CHAR",    len: "24",   blank: true },
    { idx: 32, field: "DESC5",       type: "CHAR",    len: "24",   blank: true },
    { idx: 33, field: "DESC6",       type: "CHAR",    len: "24",   blank: true },
    { idx: 34, field: "ADJUST_SW",   type: "CHAR",    len: "1",    note: "N" },
    { idx: 35, field: "NONCUST_SW",  type: "CHAR",    len: "1",    blank: true },
    { idx: 36, field: "BROKER_NO",   type: "INTEGER", len: "5",    note: "24020 or 35025" },
    { idx: 37, field: "REINVEST_SW", type: "CHAR",    len: "1",    note: "Y=reinvest entry" },
    { idx: 38, field: "FREE_CREDIT", type: "CHAR",    len: "1",    note: "Y" },
    { idx: 39, field: "REC_TYPE",    type: "CHAR",    len: "1",    note: "D=dividend" },
    { idx: 40, field: "STATUS",      type: "CHAR",    len: "1",    blank: true },
    { idx: 41, field: "BATCH_JOB",   type: "CHAR",    len: "8",    blank: true },
    { idx: 42, field: "STATE_CODE",  type: "CHAR",    len: "2",    blank: true },
    { idx: 43, field: "BANK_NO",     type: "INTEGER", len: "5",    blank: true },
    { idx: 44, field: "CHANGE_TMS",  type: "CHAR",    len: "26",   note: "M/D/YYYY H:MM:SS AM/PM" },
  ]},
  YRINC: { totalCols: 49, rows: [
    { idx: 8,  field: "CUSIP",       type: "CHAR",    len: "12",   blank: true },
    { idx: 9,  field: "SEC_TYPE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 10, field: "CLASS",       type: "CHAR",    len: "1",    blank: true },
    { idx: 11, field: "SYMBOL",      type: "CHAR",    len: "10",   blank: true },
    { idx: 12, field: "MGN_CODE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 13, field: "STD_INST",    type: "CHAR",    len: "2",    blank: true },
    { idx: 14, field: "«filler»",    blank: true },
    { idx: 15, field: "TRADE_DATE",  type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 16, field: "ASOF_CYMD",   type: "CHAR",    len: "10",   blank: true },
    { idx: 17, field: "SETTLE_DATE", type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 18, field: "ORIGIN",      type: "CHAR",    len: "5",    blank: true },
    { idx: 19, field: "TRAN_RID",    type: "CHAR",    len: "23",   blank: true },
    { idx: 20, field: "CONTROL_NO",  type: "INTEGER", len: "7",    note: "0" },
    { idx: 21, field: "SOURCE_CODE", type: "CHAR",    len: "5",    note: "= YRINC" },
    { idx: 22, field: "PURCH_OR_SALE",type:"CHAR",    len: "1",    blank: true },
    { idx: 23, field: "ACCRUED_INT", type: "DEC",     len: "13,2", note: "0" },
    { idx: 24, field: "NET_AMT",     type: "DEC",     len: "13,2", note: "+/- dividend or interest" },
    { idx: 25, field: "OFFSET_ACCT", type: "INTEGER", len: "9",    blank: true },
    { idx: 26, field: "OFFSET_TYPE", type: "INTEGER", len: "1",    blank: true },
    { idx: 27, field: "REF_AMOUNT",  type: "DEC",     len: "13,2", note: "Extra ref amount (YRINC-only)" },
    { idx: 28, field: "USER_FIELD",  type: "INTEGER", len: "5",    blank: true },
    { idx: 29, field: "TAG_NO",      type: "DEC",     len: "11,0", blank: true },
    { idx: 30, field: "CRNCY_TYPE",  type: "INTEGER", len: "5",    note: "0=USD" },
    { idx: 31, field: "DESC1",       type: "CHAR",    len: "24",   note: "DIVIDENDS AND INTEREST" },
    { idx: 32, field: "DESC2",       type: "CHAR",    len: "24",   note: "8-digit acct TO 8-digit acct" },
    { idx: 33, field: "DESC3",       type: "CHAR",    len: "24",   blank: true },
    { idx: 34, field: "DESC4",       type: "CHAR",    len: "24",   blank: true },
    { idx: 35, field: "DESC5",       type: "CHAR",    len: "24",   blank: true },
    { idx: 36, field: "DESC6",       type: "CHAR",    len: "24",   blank: true },
    { idx: 37, field: "ADJUST_SW",   type: "CHAR",    len: "1",    note: "N or Y" },
    { idx: 38, field: "NONCUST_SW",  type: "CHAR",    len: "1",    blank: true },
    { idx: 39, field: "CROSS_REF",   type: "INTEGER", len: "9",    note: "Internal cross-reference ID" },
    { idx: 40, field: "BROKER_NO",   type: "INTEGER", len: "5",    note: "e.g. 22298" },
    { idx: 41, field: "REINVEST_SW", type: "CHAR",    len: "1",    note: "N" },
    { idx: 42, field: "FREE_CREDIT", type: "CHAR",    len: "1",    note: "Y" },
    { idx: 43, field: "REC_TYPE",    type: "CHAR",    len: "1",    note: "D=dividend" },
    { idx: 44, field: "STATUS",      type: "CHAR",    len: "1",    blank: true },
    { idx: 45, field: "BATCH_JOB",   type: "CHAR",    len: "8",    blank: true },
    { idx: 46, field: "STATE_CODE",  type: "CHAR",    len: "2",    blank: true },
    { idx: 47, field: "BANK_NO",     type: "INTEGER", len: "5",    blank: true },
    { idx: 48, field: "CHANGE_TMS",  type: "CHAR",    len: "26",   note: "M/D/YYYY H:MM:SS AM/PM" },
  ]},
  WRAP: { totalCols: 51, rows: [
    { idx: 8,  field: "CUSIP",       type: "CHAR",    len: "12",   blank: true },
    { idx: 9,  field: "SEC_TYPE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 10, field: "CLASS",       type: "CHAR",    len: "1",    blank: true },
    { idx: 11, field: "SYMBOL",      type: "CHAR",    len: "10",   blank: true },
    { idx: 12, field: "MGN_CODE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 13, field: "STD_INST",    type: "CHAR",    len: "2",    blank: true },
    { idx: 14, field: "«filler»",    blank: true },
    { idx: 15, field: "TRADE_DATE",  type: "CHAR",    len: "10",   note: "CCYY-MM-DD — NO SETTLE_DATE" },
    { idx: 16, field: "«filler»",    blank: true, note: "SETTLE absent — 4 blanks" },
    { idx: 17, field: "«filler»",    blank: true },
    { idx: 18, field: "«filler»",    blank: true },
    { idx: 19, field: "«filler»",    blank: true },
    { idx: 20, field: "CONTROL_NO",  type: "INTEGER", len: "7",    note: "0" },
    { idx: 21, field: "BIG_QTY",     type: "DEC",     len: "15,5", note: "0.00000" },
    { idx: 22, field: "SOURCE_CODE", type: "CHAR",    len: "5",    note: "= WRAP" },
    { idx: 23, field: "PURCH_OR_SALE",type:"CHAR",    len: "1",    blank: true },
    { idx: 24, field: "ACCRUED_INT", type: "DEC",     len: "13,2", note: "0" },
    { idx: 25, field: "NET_AMT",     type: "DEC",     len: "13,2", note: "Management/wrap fee amount" },
    { idx: 26, field: "OFFSET_ACCT", type: "INTEGER", len: "9",    blank: true },
    { idx: 27, field: "OFFSET_TYPE", type: "INTEGER", len: "1",    blank: true },
    { idx: 28, field: "NO_CREDIT",   type: "CHAR",    len: "1",    blank: true },
    { idx: 29, field: "BILLING_REF", type: "INTEGER", len: "5",    note: "Internal billing reference" },
    { idx: 30, field: "TAG_NO",      type: "DEC",     len: "11,0", note: "0" },
    { idx: 31, field: "CRNCY_TYPE",  type: "INTEGER", len: "5",    note: "0=USD" },
    { idx: 32, field: "BROKER_NO_2", type: "INTEGER", len: "5",    blank: true },
    { idx: 33, field: "DESC1",       type: "CHAR",    len: "24",   note: "e.g. MGMT FEE" },
    { idx: 34, field: "DESC2",       type: "CHAR",    len: "24",   note: "e.g. BILL VAL 1,000,000.00" },
    { idx: 35, field: "DESC3",       type: "CHAR",    len: "24",   note: "Date range: 01/01/25 THRU 03/31/25" },
    { idx: 36, field: "DESC4",       type: "CHAR",    len: "24",   blank: true },
    { idx: 37, field: "DESC5",       type: "CHAR",    len: "24",   blank: true },
    { idx: 38, field: "DESC6",       type: "CHAR",    len: "24",   blank: true },
    { idx: 39, field: "MLP_CODE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 40, field: "ADJUST_SW",   type: "CHAR",    len: "1",    note: "N or Y" },
    { idx: 41, field: "NONCUST_SW",  type: "CHAR",    len: "1",    blank: true },
    { idx: 42, field: "BROKER_NO",   type: "INTEGER", len: "5",    note: "20138 or 22298" },
    { idx: 43, field: "REINVEST_SW", type: "CHAR",    len: "1",    note: "N" },
    { idx: 44, field: "FREE_CREDIT", type: "CHAR",    len: "1",    note: "Y" },
    { idx: 45, field: "REC_TYPE",    type: "CHAR",    len: "1",    note: "C=cash" },
    { idx: 46, field: "STATUS",      type: "CHAR",    len: "1",    blank: true },
    { idx: 47, field: "BATCH_JOB",   type: "CHAR",    len: "8",    blank: true },
    { idx: 48, field: "STATE_CODE",  type: "CHAR",    len: "2",    blank: true },
    { idx: 49, field: "BANK_NO",     type: "INTEGER", len: "5",    blank: true },
    { idx: 50, field: "CHANGE_TMS",  type: "CHAR",    len: "26",   note: "M/D/YYYY H:MM:SS AM/PM" },
  ]},
  RPRM: { totalCols: 48, rows: [
    { idx: 8,  field: "CUSIP",       type: "CHAR",    len: "12",   blank: true },
    { idx: 9,  field: "SEC_TYPE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 10, field: "CLASS",       type: "CHAR",    len: "1",    blank: true },
    { idx: 11, field: "SYMBOL",      type: "CHAR",    len: "10",   blank: true },
    { idx: 12, field: "MGN_CODE",    type: "CHAR",    len: "1",    blank: true },
    { idx: 13, field: "STD_INST",    type: "CHAR",    len: "2",    blank: true },
    { idx: 14, field: "«filler»",    blank: true },
    { idx: 15, field: "TRADE_DATE",  type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 16, field: "ASOF_CYMD",   type: "CHAR",    len: "10",   blank: true },
    { idx: 17, field: "SETTLE_DATE", type: "CHAR",    len: "10",   note: "CCYY-MM-DD" },
    { idx: 18, field: "ORIGIN",      type: "CHAR",    len: "5",    blank: true },
    { idx: 19, field: "TRAN_RID",    type: "CHAR",    len: "23",   blank: true },
    { idx: 20, field: "CONTROL_NO",  type: "INTEGER", len: "7",    note: "0" },
    { idx: 21, field: "SOURCE_CODE", type: "CHAR",    len: "5",    note: "= RPRM" },
    { idx: 22, field: "PURCH_OR_SALE",type:"CHAR",    len: "1",    blank: true },
    { idx: 23, field: "ACCRUED_INT", type: "DEC",     len: "13,2", note: "0" },
    { idx: 24, field: "NET_AMT",     type: "DEC",     len: "13,2", note: "Premium distribution amount" },
    { idx: 25, field: "OFFSET_ACCT", type: "INTEGER", len: "9",    blank: true },
    { idx: 26, field: "OFFSET_TYPE", type: "INTEGER", len: "1",    blank: true },
    { idx: 27, field: "NO_CREDIT",   type: "CHAR",    len: "1",    blank: true },
    { idx: 28, field: "USER_FIELD",  type: "INTEGER", len: "5",    blank: true },
    { idx: 29, field: "TAG_NO",      type: "DEC",     len: "11,0", blank: true },
    { idx: 30, field: "DESC1",       type: "CHAR",    len: "24",   note: "Source account reference" },
    { idx: 31, field: "DESC2",       type: "CHAR",    len: "24",   note: "Destination account reference" },
    { idx: 32, field: "DESC3",       type: "CHAR",    len: "24",   blank: true },
    { idx: 33, field: "DESC4",       type: "CHAR",    len: "24",   blank: true },
    { idx: 34, field: "DESC5",       type: "CHAR",    len: "24",   blank: true },
    { idx: 35, field: "DESC6",       type: "CHAR",    len: "24",   blank: true },
    { idx: 36, field: "ADJUST_SW",   type: "CHAR",    len: "1",    note: "N or Y" },
    { idx: 37, field: "NONCUST_SW",  type: "CHAR",    len: "1",    blank: true },
    { idx: 38, field: "NONCUST_SW",  type: "CHAR",    len: "1",    blank: true },
    { idx: 39, field: "BROKER_NO",   type: "INTEGER", len: "5",    note: "e.g. 22298" },
    { idx: 40, field: "REINVEST_SW", type: "CHAR",    len: "1",    note: "N" },
    { idx: 41, field: "FREE_CREDIT", type: "CHAR",    len: "1",    note: "Y" },
    { idx: 42, field: "REC_TYPE",    type: "CHAR",    len: "1",    note: "C=cash" },
    { idx: 43, field: "STATUS",      type: "CHAR",    len: "1",    blank: true },
    { idx: 44, field: "BATCH_JOB",   type: "CHAR",    len: "8",    blank: true },
    { idx: 45, field: "STATE_CODE",  type: "CHAR",    len: "2",    blank: true },
    { idx: 46, field: "BANK_NO",     type: "INTEGER", len: "5",    blank: true },
    { idx: 47, field: "CHANGE_TMS",  type: "CHAR",    len: "26",   note: "M/D/YYYY H:MM:SS AM/PM" },
  ]},
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColTable({ rows }: { rows: CatalogEntry[] }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-muted/80 text-muted-foreground">
          <th className="px-1.5 py-1 text-left border border-border font-medium w-7">Idx</th>
          <th className="px-1.5 py-1 text-left border border-border font-medium">Field</th>
          <th className="px-1.5 py-1 text-left border border-border font-medium w-16">Type</th>
          <th className="px-1.5 py-1 text-left border border-border font-medium w-10">Len</th>
          <th className="px-1.5 py-1 text-left border border-border font-medium">Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={i}
            className={
              r.blank
                ? "opacity-40"
                : i % 2 === 0 ? "" : "bg-muted/20"
            }
          >
            <td className="px-1.5 py-0.5 border border-border font-mono text-muted-foreground">{r.idx}</td>
            <td className={`px-1.5 py-0.5 border border-border font-mono ${r.blank ? "italic" : "font-semibold"}`}>
              {r.field}
            </td>
            <td className="px-1.5 py-0.5 border border-border text-blue-600 dark:text-blue-400 font-mono">
              {r.type ?? ""}
            </td>
            <td className="px-1.5 py-0.5 border border-border text-muted-foreground font-mono">
              {r.len ?? ""}
            </td>
            <td className="px-1.5 py-0.5 border border-border text-muted-foreground">{r.note ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PositionCatalog() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors rounded-t-lg"
        onClick={() => setOpen(v => !v)}
      >
        <span className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Column Position Catalog — SAL_CSH
          <span className="text-xs font-normal text-muted-foreground">(from CSH Documentation.pdf · EXCSHY2K copybook)</span>
        </span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {open && (
        <CardContent className="pt-0 space-y-5">

          {/* Common columns — shared by all SOURCE_CODEs */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Common columns — indices 0–7 (present in every SOURCE_CODE)
            </Label>
            <ColTable rows={COMMON_COLS} />
          </div>

          {/* Side-by-side SOURCE_CODE grids */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Source-code specific columns (indices 8+) — all SOURCE_CODEs shown side by side
            </Label>
            <div className="overflow-x-auto">
              <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                {Object.entries(SOURCE_COLS).map(([sc, { totalCols, rows }]) => (
                  <div key={sc} className="flex-shrink-0 w-[340px]">
                    {/* Card header */}
                    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-t border border-b-0 border-border font-mono text-xs font-bold ${
                      SOURCE_CODE_INFO[sc]?.hasSecurity
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
                        : "bg-muted text-foreground"
                    }`}>
                      <span>{sc}</span>
                      <span className="font-normal opacity-70">{totalCols} cols total</span>
                    </div>
                    {/* Field table */}
                    <div className="border border-border rounded-b overflow-hidden">
                      <ColTable rows={rows} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 mr-1" />
              Blue header = security fields populated (SEC_NO, SEC_TYPE, JULIAN_LOT required).
              Greyed rows = filler / unused for that SOURCE_CODE.
              Type/Len from Thomson Reuters BETA Systems CSH Documentation (2020).
            </p>
          </div>

        </CardContent>
      )}
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EnvestnetMode() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState("csh");
  const [recordCount, setRecordCount]   = useState(100);
  const [includeManifest, setIncludeManifest] = useState(true);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<{
    data: string;
    manifest: string;
    recordCount: number;
    breakdown: { positive: number; edge: number; negative: number };
  } | null>(null);

  const ft = FILE_TYPES.find(f => f.id === selectedFile)!;

  async function generate() {
    if (!ft.available) return;
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch("/api/synthetic-data/envestnet/generate-csh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordCount, includeManifest }),
      });
      const json = await resp.json();
      if (!json.success) throw new Error(json.error);
      setResult({ data: json.data, manifest: json.manifest, recordCount: json.recordCount, breakdown: json.breakdown });
      toast({ title: "Generated", description: `${json.recordCount} records across all SOURCE_CODEs` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <span className="font-semibold">Envestnet / BETA Systems custodian file generator.</span>{" "}
          Produces realistic pipe-delimited test data with correct SOURCE_CODE conditional logic,
          derived from actual Sal_csh.txt sample analysis. Includes positive, edge, and negative test records.
        </div>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-6">
        {/* File type selector */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">File Type</Label>
          {FILE_TYPES.map(f => (
            <button
              key={f.id}
              onClick={() => { if (f.available) { setSelectedFile(f.id); setResult(null); } }}
              disabled={!f.available}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedFile === f.id && f.available
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                  : f.available
                    ? "border-border hover:border-blue-300 hover:bg-muted/50"
                    : "border-border/50 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-semibold">{f.label}</span>
                {f.available
                  ? <Badge variant="outline" className="text-xs text-green-600 border-green-300">Ready</Badge>
                  : <Badge variant="outline" className="text-xs text-muted-foreground">Soon</Badge>
                }
              </div>
              <div className="text-xs text-muted-foreground">{f.fullName}</div>
              <div className="text-xs text-muted-foreground mt-0.5">→ {f.table}</div>
            </button>
          ))}
        </div>

        {/* Config + output panel */}
        <div className="space-y-4">
          {/* Config card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{ft.label} — {ft.fullName}</CardTitle>
              <CardDescription className="text-xs">{ft.colNote}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SOURCE_CODE pills */}
              {ft.sourceCodes.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">SOURCE_CODE scenarios (all included)</Label>
                  <div className="flex flex-wrap gap-2">
                    {ft.sourceCodes.map(sc => {
                      const info = SOURCE_CODE_INFO[sc];
                      return (
                        <div key={sc} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted border border-border text-xs">
                          <span className="font-mono font-semibold">{sc}</span>
                          {info.hasSecurity && <span className="text-blue-500">●</span>}
                          <span className="text-muted-foreground">— {info.desc}</span>
                          <span className="text-muted-foreground ml-1">({info.cols} cols)</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    <span className="text-blue-500">●</span> = security fields populated (SEC_NO, SEC_TYPE, lot date)
                  </p>
                </div>
              )}

              {/* Record count + options */}
              <div className="flex items-end gap-4">
                <div className="space-y-1.5 w-40">
                  <Label className="text-sm">Total records</Label>
                  <Input
                    type="number"
                    value={recordCount}
                    onChange={e => setRecordCount(Math.min(100_000, Math.max(10, parseInt(e.target.value) || 100)))}
                    min={10} max={100000}
                    className="h-8 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer pb-0.5">
                  <input
                    type="checkbox"
                    checked={includeManifest}
                    onChange={e => setIncludeManifest(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Include manifest file
                </label>
              </div>

              {/* Distribution preview */}
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ~75% positive
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  ~15% edge cases
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  ~10% negative
                </span>
              </div>

              {/* Generate button */}
              <Button
                onClick={generate}
                disabled={loading || !ft.available}
                className="w-full"
              >
                {loading ? "Generating…" : `Generate ${ft.label} Data`}
              </Button>
            </CardContent>
          </Card>

          {/* Result card */}
          {result && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {result.recordCount} records generated
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Breakdown */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="font-semibold">{result.breakdown.positive}</span>
                    <span className="text-muted-foreground">positive</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="font-semibold">{result.breakdown.edge}</span>
                    <span className="text-muted-foreground">edge</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="font-semibold">{result.breakdown.negative}</span>
                    <span className="text-muted-foreground">negative</span>
                  </div>
                </div>

                {/* Download buttons — prominent in content area */}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => downloadFile(result.data, "sal_csh_synthetic.txt")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Data (.txt)
                  </Button>
                  {includeManifest && result.manifest && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => downloadFile(result.manifest, "sal_csh_manifest.txt")}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download Manifest (.txt)
                    </Button>
                  )}
                </div>

                {/* Section labels in preview */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Preview — first 5 rows (positive section)
                  </Label>
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre font-mono leading-relaxed max-h-48">
                    {result.data.split("\n").slice(0, 5).join("\n")}
                  </pre>
                </div>

                {/* Edge + negative preview */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-yellow-600 dark:text-yellow-400 mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Edge rows (first 2)
                    </Label>
                    <pre className="text-xs bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-2 overflow-x-auto whitespace-pre font-mono leading-relaxed max-h-24">
                      {result.data.split("\n").slice(result.breakdown.positive, result.breakdown.positive + 2).join("\n")}
                    </pre>
                  </div>
                  <div>
                    <Label className="text-xs text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Negative rows (first 2)
                    </Label>
                    <pre className="text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-2 overflow-x-auto whitespace-pre font-mono leading-relaxed max-h-24">
                      {result.data.split("\n").slice(result.breakdown.positive + result.breakdown.edge, result.breakdown.positive + result.breakdown.edge + 2).join("\n")}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Position catalog — always visible below */}
          <PositionCatalog />
        </div>
      </div>
    </div>
  );
}
