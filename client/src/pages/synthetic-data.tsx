import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { useBranding } from "@/contexts/BrandingContext";
import { SampleFileUploadMode } from "@/components/synthetic-data/SampleFileUploadMode";
import { GenerationHistoryView } from "@/components/synthetic-data/GenerationHistoryView";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DomainDefinition, SubDomainDefinition, GeneratedDataResult } from "@shared/schema";
import {
  Building2,
  Shield,
  HeartPulse,
  ShoppingCart,
  Radio,
  Factory,
  Upload,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Database,
  Sparkles,
  Check,
  ChevronRight,
  Loader2,
  Eye,
  Settings2,
  Plus,
  X,
  Brain,
  Wand2,
  History
} from "lucide-react";

const DOMAIN_DEFINITIONS: DomainDefinition[] = [
  {
    id: "banking",
    name: "Banking & Finance",
    icon: "Building2",
    description: "Core banking, lending, payments, treasury, trade finance",
    subDomains: [
      {
        id: "core_banking",
        name: "Core Banking",
        icon: "Building2",
        fieldCount: 28,
        fields: [
          "Account_Number", "Account_Type", "Customer_ID", "Customer_First_Name", "Customer_Last_Name",
          "Account_Open_Date", "Account_Status", "Current_Balance", "Available_Balance", "Currency_Code",
          "Branch_Code", "Branch_Name", "IBAN", "SWIFT_Code", "Interest_Rate",
          "Overdraft_Limit", "Last_Transaction_Date", "Monthly_Fee", "Account_Tier",
          "Joint_Account_Flag", "Nominee_Name", "KYC_Status", "Risk_Rating",
          "Credit_Score", "Relationship_Manager", "Segment", "Product_Bundle", "Digital_Banking_Enrolled"
        ]
      },
      {
        id: "lending",
        name: "Lending",
        icon: "FileText",
        fieldCount: 30,
        fields: [
          "Loan_Number", "Loan_Type", "Borrower_Name", "Borrower_ID", "Application_Date",
          "Approval_Date", "Disbursement_Date", "Loan_Amount", "Interest_Rate", "Loan_Term_Months",
          "EMI_Amount", "Outstanding_Principal", "Outstanding_Interest", "Loan_Status",
          "Collateral_Type", "Collateral_Value", "LTV_Ratio", "DTI_Ratio", "Credit_Score",
          "Employment_Type", "Annual_Income", "Employer_Name", "Co_Borrower_Name",
          "Guarantor_Name", "Repayment_Frequency", "Next_Due_Date", "Days_Past_Due",
          "Delinquency_Bucket", "Write_Off_Amount", "Recovery_Amount"
        ]
      },
      {
        id: "payments",
        name: "Payments",
        icon: "CreditCard",
        fieldCount: 25,
        fields: [
          "Transaction_ID", "Transaction_Date", "Transaction_Time", "Sender_Account", "Receiver_Account",
          "Transaction_Amount", "Currency", "Transaction_Type", "Payment_Method", "Payment_Channel",
          "Reference_Number", "Description", "Status", "Fee_Amount", "Exchange_Rate",
          "Original_Currency", "Original_Amount", "Beneficiary_Name", "Beneficiary_Bank",
          "Beneficiary_Country", "Purpose_Code", "SWIFT_Message_Type", "Settlement_Date",
          "Batch_ID", "Authorization_Code"
        ]
      },
      {
        id: "treasury",
        name: "Cash & Treasury",
        icon: "Wallet",
        fieldCount: 22,
        fields: [
          "Position_ID", "Position_Date", "Currency", "Opening_Balance", "Closing_Balance",
          "Inflows", "Outflows", "Net_Position", "Nostro_Account", "Vostro_Account",
          "Counterparty", "Instrument_Type", "Maturity_Date", "Interest_Rate", "Face_Value",
          "Market_Value", "Duration", "Yield", "Credit_Rating", "Liquidity_Buffer",
          "Regulatory_Requirement", "Compliance_Status"
        ]
      },
      {
        id: "trade_finance",
        name: "Trade Finance",
        icon: "Ship",
        fieldCount: 26,
        fields: [
          "LC_Number", "LC_Type", "Applicant_Name", "Beneficiary_Name", "Issuing_Bank",
          "Advising_Bank", "LC_Amount", "Currency", "Issue_Date", "Expiry_Date",
          "Shipment_Date", "Port_of_Loading", "Port_of_Discharge", "Goods_Description",
          "Incoterms", "Payment_Terms", "Documents_Required", "Amendment_Count",
          "Discrepancy_Status", "Presentation_Date", "Acceptance_Date", "Payment_Date",
          "Margin_Percentage", "Commission_Amount", "SWIFT_MT700", "UCP_Version"
        ]
      },
      {
        id: "wealth_management",
        name: "Wealth Management",
        icon: "TrendingUp",
        fieldCount: 24,
        fields: [
          "Portfolio_ID", "Client_ID", "Client_Name", "Relationship_Manager", "AUM_Total",
          "Risk_Profile", "Investment_Objective", "Asset_Class", "Security_Name", "ISIN",
          "Quantity", "Average_Cost", "Current_Price", "Market_Value", "Unrealized_PL",
          "Allocation_Percentage", "Benchmark", "Return_YTD", "Return_1Y", "Return_3Y",
          "Dividend_Yield", "Last_Rebalance_Date", "Fee_Structure", "Custody_Account"
        ]
      }
    ]
  },
  {
    id: "insurance",
    name: "Insurance",
    icon: "Shield",
    description: "Auto, home, commercial, life, health, claims",
    subDomains: [
      {
        id: "auto",
        name: "Personal Auto",
        icon: "Car",
        fieldCount: 26,
        fields: [
          "Policy_Number", "Insured_First_Name", "Insured_Last_Name", "Policy_Effective_Date",
          "Policy_Expiration_Date", "Premium_Amount", "Payment_Plan", "Agent_Code",
          "VIN", "Vehicle_Year", "Vehicle_Make", "Vehicle_Model", "Vehicle_Usage",
          "Annual_Mileage", "Garaging_Address", "Bodily_Injury_Limit", "Property_Damage_Limit",
          "Collision_Deductible", "Comprehensive_Deductible", "Driver_License_Number",
          "Driver_DOB", "Years_Licensed", "MVR_Score", "Prior_Insurance_Carrier",
          "Claims_History_Count", "Multi_Policy_Discount"
        ]
      },
      {
        id: "homeowner",
        name: "Homeowner",
        icon: "Home",
        fieldCount: 28,
        fields: [
          "Policy_Number", "Insured_First_Name", "Insured_Last_Name", "Property_Address",
          "Policy_Form", "Policy_Effective_Date", "Policy_Expiration_Date", "Premium_Amount",
          "Mortgage_Company", "Year_Built", "Square_Footage", "Construction_Type",
          "Roof_Type", "Roof_Age", "Number_Stories", "Basement_Type", "Swimming_Pool",
          "Dwelling_Coverage_A", "Other_Structures_B", "Personal_Property_C",
          "Loss_of_Use_D", "Personal_Liability_E", "Medical_Payments_F",
          "AOP_Deductible", "Wind_Hail_Deductible", "Water_Backup_Coverage",
          "Home_Business_Coverage", "Credit_Score"
        ]
      },
      {
        id: "commercial",
        name: "Commercial Property",
        icon: "Building",
        fieldCount: 32,
        fields: [
          "Policy_Number", "Business_Name", "Policy_Effective_Date", "Policy_Expiration_Date",
          "Total_Premium", "Producer_Code", "Building_Address", "Construction_Type",
          "Occupancy_Class", "Year_Built", "Total_Square_Footage", "Number_Stories",
          "Sprinkler_System", "Building_Coverage_Limit", "BPP_Coverage_Limit",
          "Business_Income_Limit", "Equipment_Breakdown_Limit", "Protection_Class",
          "Fire_Station_Distance", "Security_System", "COPE_Construction", "COPE_Occupancy",
          "COPE_Protection", "COPE_Exposure", "Deductible_Amount", "Form_Number",
          "Territory_Code", "SIC_Code", "Risk_Classification", "Building_Value",
          "Contents_Value", "Loss_Payee"
        ]
      },
      {
        id: "claims",
        name: "Claims",
        icon: "FileWarning",
        fieldCount: 24,
        fields: [
          "Claim_Number", "Policy_Number", "Claimant_Name", "Date_of_Loss", "Date_Reported",
          "Claim_Type", "Loss_Description", "Loss_Location", "Estimated_Amount", "Paid_Amount",
          "Reserve_Amount", "Claim_Status", "Adjuster_Name", "Adjuster_Phone",
          "Liability_Determination", "Subrogation_Flag", "Fraud_Indicator", "SIU_Referral",
          "Attorney_Involved", "Settlement_Date", "Payment_Method", "Deductible_Applied",
          "Catastrophe_Code", "Cause_of_Loss"
        ]
      },
      {
        id: "life",
        name: "Life Insurance",
        icon: "Heart",
        fieldCount: 26,
        fields: [
          "Policy_Number", "Policy_Type", "Insured_Name", "Insured_DOB", "Insured_Gender",
          "Policy_Effective_Date", "Face_Amount", "Premium_Amount", "Premium_Frequency",
          "Beneficiary_Name", "Beneficiary_Relationship", "Contingent_Beneficiary",
          "Cash_Value", "Surrender_Value", "Loan_Amount", "Death_Benefit",
          "Riders", "Underwriting_Class", "Smoker_Status", "Health_Rating",
          "Agent_Code", "Commission_Rate", "Policy_Status", "Lapse_Date",
          "Reinstatement_Date", "Maturity_Date"
        ]
      },
      {
        id: "health",
        name: "Health Insurance",
        icon: "Activity",
        fieldCount: 28,
        fields: [
          "Member_ID", "Group_Number", "Subscriber_Name", "Subscriber_DOB", "Relationship",
          "Effective_Date", "Termination_Date", "Plan_Type", "Plan_Name", "Premium_Amount",
          "Employer_Contribution", "Employee_Contribution", "Deductible_Individual",
          "Deductible_Family", "Out_of_Pocket_Max", "Copay_PCP", "Copay_Specialist",
          "Coinsurance_Rate", "Network_Type", "PCP_Name", "PCP_NPI",
          "Pharmacy_Benefit", "Dental_Benefit", "Vision_Benefit", "Mental_Health_Benefit",
          "Preauthorization_Required", "Claims_Address", "Member_Services_Phone"
        ]
      }
    ]
  },
  {
    id: "healthcare",
    name: "Healthcare",
    icon: "HeartPulse",
    description: "Patients, clinical records, pharmacy, billing, labs",
    subDomains: [
      {
        id: "patients",
        name: "Patient Demographics",
        icon: "Users",
        fieldCount: 26,
        fields: [
          "Patient_ID", "MRN", "First_Name", "Last_Name", "Date_of_Birth", "Gender",
          "SSN", "Address", "City", "State", "Zip_Code", "Phone_Number", "Email",
          "Emergency_Contact", "Emergency_Phone", "Insurance_ID", "Insurance_Name",
          "PCP_Name", "PCP_NPI", "Blood_Type", "Allergies", "Primary_Language",
          "Marital_Status", "Employment_Status", "Registration_Date", "Last_Visit_Date"
        ]
      },
      {
        id: "encounters",
        name: "Clinical Encounters",
        icon: "Stethoscope",
        fieldCount: 28,
        fields: [
          "Encounter_ID", "Patient_ID", "Encounter_Date", "Encounter_Type", "Facility_Name",
          "Department", "Attending_Physician", "Attending_NPI", "Chief_Complaint",
          "Diagnosis_Code_Primary", "Diagnosis_Code_Secondary", "Procedure_Code",
          "Vital_BP_Systolic", "Vital_BP_Diastolic", "Vital_Heart_Rate", "Vital_Temperature",
          "Vital_Weight", "Vital_Height", "BMI", "Medications_Prescribed",
          "Lab_Orders", "Imaging_Orders", "Follow_Up_Instructions", "Discharge_Disposition",
          "Length_of_Stay", "Admission_Source", "DRG_Code", "Encounter_Status"
        ]
      },
      {
        id: "pharmacy",
        name: "Pharmacy",
        icon: "Pill",
        fieldCount: 24,
        fields: [
          "Prescription_ID", "Patient_ID", "Prescriber_Name", "Prescriber_NPI", "Drug_Name",
          "NDC_Code", "Drug_Strength", "Drug_Form", "Quantity", "Days_Supply",
          "Refills_Authorized", "Refills_Remaining", "Prescription_Date", "Fill_Date",
          "Pharmacy_Name", "Pharmacy_NPI", "DAW_Code", "Copay_Amount", "Drug_Cost",
          "Formulary_Status", "Prior_Auth_Required", "Therapeutic_Class", "DEA_Schedule",
          "Prescription_Status"
        ]
      },
      {
        id: "billing",
        name: "Medical Billing",
        icon: "Receipt",
        fieldCount: 26,
        fields: [
          "Claim_ID", "Patient_ID", "Encounter_ID", "Service_Date", "Billing_Provider_NPI",
          "Rendering_Provider_NPI", "Place_of_Service", "CPT_Code", "ICD10_Code",
          "Modifier", "Units", "Charge_Amount", "Allowed_Amount", "Paid_Amount",
          "Patient_Responsibility", "Adjustment_Amount", "Adjustment_Reason",
          "Payer_Name", "Payer_ID", "Claim_Status", "Submission_Date", "Payment_Date",
          "EOB_Date", "Denial_Code", "Appeal_Status", "Timely_Filing_Date"
        ]
      },
      {
        id: "lab_results",
        name: "Lab Results",
        icon: "TestTube",
        fieldCount: 22,
        fields: [
          "Lab_Order_ID", "Patient_ID", "Ordering_Provider", "Order_Date", "Collection_Date",
          "Result_Date", "Test_Name", "LOINC_Code", "Result_Value", "Result_Units",
          "Reference_Range_Low", "Reference_Range_High", "Abnormal_Flag", "Critical_Flag",
          "Specimen_Type", "Specimen_Source", "Performing_Lab", "Lab_CLIA",
          "Technologist_ID", "Result_Status", "Comments", "Fasting_Status"
        ]
      }
    ]
  },
  {
    id: "retail",
    name: "Retail & E-Commerce",
    icon: "ShoppingCart",
    description: "Products, orders, inventory, customers, loyalty",
    subDomains: [
      {
        id: "products",
        name: "Product Catalog",
        icon: "Package",
        fieldCount: 24,
        fields: [
          "Product_ID", "SKU", "Product_Name", "Product_Description", "Category",
          "Subcategory", "Brand", "Manufacturer", "Unit_Price", "Cost_Price",
          "Weight", "Dimensions", "Color", "Size", "Material",
          "UPC_Code", "EAN_Code", "Stock_Quantity", "Reorder_Level", "Lead_Time_Days",
          "Supplier_ID", "Tax_Category", "Is_Active", "Launch_Date"
        ]
      },
      {
        id: "orders",
        name: "Orders",
        icon: "ShoppingBag",
        fieldCount: 28,
        fields: [
          "Order_ID", "Order_Date", "Customer_ID", "Customer_Name", "Email",
          "Shipping_Address", "Billing_Address", "Order_Status", "Payment_Method",
          "Payment_Status", "Subtotal", "Tax_Amount", "Shipping_Cost", "Discount_Amount",
          "Total_Amount", "Currency", "Promo_Code", "Order_Source", "Device_Type",
          "IP_Address", "Shipping_Method", "Tracking_Number", "Estimated_Delivery",
          "Actual_Delivery", "Return_Status", "Refund_Amount", "Notes", "Gift_Message"
        ]
      },
      {
        id: "inventory",
        name: "Inventory",
        icon: "Warehouse",
        fieldCount: 22,
        fields: [
          "Inventory_ID", "Product_ID", "SKU", "Warehouse_ID", "Location_Code",
          "Quantity_On_Hand", "Quantity_Reserved", "Quantity_Available", "Quantity_In_Transit",
          "Last_Counted_Date", "Last_Received_Date", "Last_Sold_Date", "Average_Daily_Sales",
          "Days_of_Supply", "Reorder_Point", "Safety_Stock", "Max_Stock_Level",
          "ABC_Classification", "Inventory_Value", "FIFO_Cost", "Lot_Number", "Expiry_Date"
        ]
      },
      {
        id: "customers",
        name: "Customers",
        icon: "Users",
        fieldCount: 26,
        fields: [
          "Customer_ID", "First_Name", "Last_Name", "Email", "Phone",
          "Date_of_Birth", "Gender", "Address_Line1", "Address_Line2", "City",
          "State", "Zip_Code", "Country", "Registration_Date", "Last_Order_Date",
          "Total_Orders", "Total_Spend", "Average_Order_Value", "Customer_Segment",
          "Loyalty_Tier", "Loyalty_Points", "Preferred_Channel", "Email_Opt_In",
          "SMS_Opt_In", "Referral_Source", "Customer_Status"
        ]
      },
      {
        id: "loyalty",
        name: "Loyalty Program",
        icon: "Award",
        fieldCount: 20,
        fields: [
          "Member_ID", "Customer_ID", "Enrollment_Date", "Tier_Level", "Points_Balance",
          "Points_Earned_YTD", "Points_Redeemed_YTD", "Points_Expired_YTD", "Tier_Qualification_Date",
          "Tier_Expiration_Date", "Lifetime_Points", "Lifetime_Spend", "Birthday_Bonus_Used",
          "Referral_Count", "Referral_Bonus_Earned", "Preferred_Reward_Type",
          "Last_Activity_Date", "Engagement_Score", "Churn_Risk_Score", "Member_Status"
        ]
      }
    ]
  },
  {
    id: "telecom",
    name: "Telecommunications",
    icon: "Radio",
    description: "Subscribers, usage, billing, network, support",
    subDomains: [
      {
        id: "subscribers",
        name: "Subscribers",
        icon: "Users",
        fieldCount: 26,
        fields: [
          "Subscriber_ID", "Account_Number", "First_Name", "Last_Name", "Email",
          "Phone_Number", "MSISDN", "IMSI", "Service_Address", "Billing_Address",
          "Account_Type", "Customer_Segment", "Activation_Date", "Contract_Start_Date",
          "Contract_End_Date", "Plan_Name", "Plan_Type", "Monthly_Charge", "Credit_Class",
          "Payment_Method", "Auto_Pay_Enrolled", "Paperless_Billing", "Account_Status",
          "Churn_Score", "NPS_Score", "Last_Interaction_Date"
        ]
      },
      {
        id: "usage",
        name: "Usage & CDR",
        icon: "Activity",
        fieldCount: 24,
        fields: [
          "CDR_ID", "Subscriber_ID", "MSISDN", "Call_Date", "Call_Time", "Call_Duration_Seconds",
          "Call_Type", "Originating_Number", "Terminating_Number", "Originating_Cell_ID",
          "Terminating_Cell_ID", "Call_Direction", "Roaming_Flag", "International_Flag",
          "Data_Volume_MB", "SMS_Count", "MMS_Count", "Billable_Amount", "Discount_Applied",
          "Rate_Plan_Applied", "Peak_Off_Peak", "Network_Type", "QoS_Score", "Call_Drop_Flag"
        ]
      },
      {
        id: "billing",
        name: "Billing",
        icon: "Receipt",
        fieldCount: 22,
        fields: [
          "Invoice_ID", "Account_Number", "Bill_Cycle", "Bill_Date", "Due_Date",
          "Previous_Balance", "Payments_Received", "Adjustments", "Current_Charges",
          "Total_Due", "Voice_Charges", "Data_Charges", "SMS_Charges", "Roaming_Charges",
          "Equipment_Charges", "Taxes_Fees", "Promo_Credits", "Late_Fee",
          "Payment_Status", "Collection_Status", "Dunning_Level", "Last_Payment_Date"
        ]
      },
      {
        id: "network",
        name: "Network Elements",
        icon: "Server",
        fieldCount: 20,
        fields: [
          "Element_ID", "Element_Name", "Element_Type", "Vendor", "Model",
          "Serial_Number", "IP_Address", "MAC_Address", "Location", "Cell_ID",
          "LAC", "MCC_MNC", "Frequency_Band", "Capacity", "Current_Load_Percent",
          "Status", "Last_Maintenance_Date", "Firmware_Version", "Installation_Date",
          "Decommission_Date"
        ]
      },
      {
        id: "support",
        name: "Support Tickets",
        icon: "Headphones",
        fieldCount: 22,
        fields: [
          "Ticket_ID", "Subscriber_ID", "Account_Number", "Created_Date", "Channel",
          "Category", "Subcategory", "Priority", "Status", "Assigned_Agent",
          "Description", "Resolution", "First_Response_Time", "Resolution_Time",
          "SLA_Breach_Flag", "Escalation_Level", "Customer_Satisfaction", "NPS_Impact",
          "Root_Cause", "Related_Tickets", "Reopen_Count", "Closed_Date"
        ]
      }
    ]
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    icon: "Factory",
    description: "Supply chain, production, quality, logistics, IoT",
    subDomains: [
      {
        id: "supply_chain",
        name: "Supply Chain",
        icon: "Truck",
        fieldCount: 26,
        fields: [
          "PO_Number", "Supplier_ID", "Supplier_Name", "Order_Date", "Expected_Delivery",
          "Actual_Delivery", "Item_Number", "Item_Description", "Quantity_Ordered",
          "Quantity_Received", "Unit_Price", "Total_Amount", "Currency", "Payment_Terms",
          "Shipping_Method", "Carrier", "Tracking_Number", "Warehouse_ID", "Receiving_Dock",
          "Quality_Check_Status", "Rejection_Reason", "Invoice_Number", "Invoice_Date",
          "Payment_Status", "Lead_Time_Days", "Supplier_Rating"
        ]
      },
      {
        id: "production",
        name: "Production Orders",
        icon: "Cog",
        fieldCount: 24,
        fields: [
          "Work_Order_ID", "Product_ID", "Product_Name", "BOM_Version", "Planned_Quantity",
          "Actual_Quantity", "Scrap_Quantity", "Yield_Percentage", "Start_Date", "End_Date",
          "Work_Center", "Production_Line", "Shift", "Operator_ID", "Machine_ID",
          "Setup_Time_Minutes", "Run_Time_Minutes", "Downtime_Minutes", "OEE_Score",
          "Status", "Priority", "Customer_Order", "Due_Date", "Quality_Hold_Flag"
        ]
      },
      {
        id: "quality",
        name: "Quality Control",
        icon: "ClipboardCheck",
        fieldCount: 22,
        fields: [
          "Inspection_ID", "Work_Order_ID", "Product_ID", "Lot_Number", "Inspection_Date",
          "Inspector_ID", "Inspection_Type", "Sample_Size", "Defects_Found", "Defect_Type",
          "Severity", "Root_Cause", "Corrective_Action", "Disposition", "Hold_Flag",
          "Release_Date", "Certificate_Number", "Spec_Deviation", "Customer_Complaint_ID",
          "CAPA_Number", "Audit_Trail", "Sign_Off_By"
        ]
      },
      {
        id: "logistics",
        name: "Logistics",
        icon: "Package",
        fieldCount: 24,
        fields: [
          "Shipment_ID", "Order_ID", "Customer_ID", "Ship_Date", "Delivery_Date",
          "Origin_Warehouse", "Destination_Address", "Carrier", "Service_Level",
          "Tracking_Number", "Weight_KG", "Dimensions", "Freight_Cost", "Insurance_Value",
          "Number_of_Packages", "Pallet_Count", "Special_Instructions", "Hazmat_Flag",
          "Temperature_Controlled", "Proof_of_Delivery", "Signature_Required",
          "Delivery_Status", "Exception_Code", "Customer_Notification"
        ]
      },
      {
        id: "iot_sensors",
        name: "IoT Sensors",
        icon: "Gauge",
        fieldCount: 20,
        fields: [
          "Sensor_ID", "Device_Type", "Machine_ID", "Location", "Reading_Timestamp",
          "Temperature_C", "Pressure_PSI", "Vibration_Hz", "Humidity_Percent", "Power_kW",
          "Speed_RPM", "Flow_Rate", "Level_Percent", "Status_Code", "Alert_Flag",
          "Threshold_Breach", "Maintenance_Due", "Firmware_Version", "Battery_Level",
          "Signal_Strength"
        ]
      }
    ]
  }
];

const getDomainIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    Building2: Building2,
    Shield: Shield,
    HeartPulse: HeartPulse,
    ShoppingCart: ShoppingCart,
    Radio: Radio,
    Factory: Factory,
  };
  const IconComponent = icons[iconName] || Building2;
  return <IconComponent className="w-6 h-6" />;
};

export default function SyntheticDataPage() {
  const { toast } = useToast();
  const { brand } = useBranding();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeMode, setActiveMode] = useState<"template" | "upload" | "history">("template");

  // Get default domain from settings (localStorage)
  const defaultDomain = localStorage.getItem("defaultDomain") || "insurance";
  
  // Map settings domain values to DOMAIN_DEFINITIONS ids
  const domainMapping: Record<string, string> = {
    insurance: "insurance",
    healthcare: "healthcare", 
    banking: "banking",
    ecommerce: "retail", // Settings uses "ecommerce", DOMAIN_DEFINITIONS uses "retail"
    telecom: "telecom",
    manufacturing: "manufacturing",
    general: "all" // "general" shows all domains
  };
  
  // Filter domains based on setting - if "general" show all, otherwise show only the selected domain
  const filteredDomains = useMemo(() => {
    const mappedDomain = domainMapping[defaultDomain] || defaultDomain;
    if (mappedDomain === "all") {
      return DOMAIN_DEFINITIONS;
    }
    return DOMAIN_DEFINITIONS.filter(d => d.id === mappedDomain);
  }, [defaultDomain]);
  
  // Auto-select domain if only one is available
  const [selectedDomain, setSelectedDomain] = useState<string | null>(() => {
    const mappedDomain = domainMapping[defaultDomain] || defaultDomain;
    if (mappedDomain !== "all") {
      const domain = DOMAIN_DEFINITIONS.find(d => d.id === mappedDomain);
      return domain ? domain.id : null;
    }
    return null;
  });
  const [selectedSubDomain, setSelectedSubDomain] = useState<SubDomainDefinition | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [recordCount, setRecordCount] = useState(100);
  const [dataPrefix, setDataPrefix] = useState("");
  const [maskingEnabled, setMaskingEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedDataResult | null>(null);
  const [processingTime, setProcessingTime] = useState<number>(0);
  
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newCustomField, setNewCustomField] = useState("");
  const [useLLMGeneration, setUseLLMGeneration] = useState(true);
  
  const currentDomain = useMemo(() => 
    DOMAIN_DEFINITIONS.find(d => d.id === selectedDomain),
    [selectedDomain]
  );
  
  const handleDomainSelect = (domainId: string) => {
    setSelectedDomain(domainId);
    setSelectedSubDomain(null);
    setSelectedFields(new Set());
    setGeneratedData(null);
  };
  
  const handleSubDomainSelect = (subDomain: SubDomainDefinition) => {
    setSelectedSubDomain(subDomain);
    setSelectedFields(new Set(subDomain.fields));
    setGeneratedData(null);
  };
  
  const handleFieldToggle = (field: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };
  
  const handleSelectAllFields = (checked: boolean) => {
    if (selectedSubDomain) {
      const allFields = [...selectedSubDomain.fields, ...customFields];
      setSelectedFields(checked ? new Set(allFields) : new Set());
    }
  };
  
  const handleAddCustomField = () => {
    if (!newCustomField.trim()) return;
    
    const fieldName = newCustomField.trim().replace(/\s+/g, "_");
    if (customFields.includes(fieldName) || selectedSubDomain?.fields.includes(fieldName)) {
      toast({
        title: "Field Already Exists",
        description: `The field "${fieldName}" already exists`,
        variant: "destructive"
      });
      return;
    }
    
    setCustomFields(prev => [...prev, fieldName]);
    setSelectedFields(prev => new Set([...prev, fieldName]));
    setNewCustomField("");
    
    toast({
      title: "Custom Field Added",
      description: `"${fieldName}" will be generated using AI`
    });
  };
  
  const handleRemoveCustomField = (field: string) => {
    setCustomFields(prev => prev.filter(f => f !== field));
    setSelectedFields(prev => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };
  
  const allAvailableFields = useMemo(() => {
    if (!selectedSubDomain) return [];
    return [...selectedSubDomain.fields, ...customFields];
  }, [selectedSubDomain, customFields]);
  
  const generateSyntheticData = async () => {
    if (!selectedSubDomain || selectedFields.size === 0) {
      toast({
        title: "Configuration Required",
        description: "Please select a sub-domain and at least one field",
        variant: "destructive"
      });
      return;
    }
    
    if (recordCount < 1 || recordCount > 50000) {
      toast({
        title: "Invalid Record Count",
        description: "Please enter a number between 1 and 50,000",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    const startTime = Date.now();
    
    try {
      const response = await apiRequest("POST", "/api/synthetic-data/generate", {
        domain: selectedDomain,
        subDomain: selectedSubDomain.id,
        fields: Array.from(selectedFields),
        customFields: customFields.filter(f => selectedFields.has(f)),
        recordCount,
        dataPrefix,
        maskingEnabled,
        useLLMGeneration
      });
      
      const data = await response.json();
      const endTime = Date.now();
      setProcessingTime((endTime - startTime) / 1000);
      
      if (data.success) {
        setGeneratedData(data.result);
        toast({
          title: "Generation Complete",
          description: `Successfully generated ${recordCount} records`
        });
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate synthetic data",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const exportToFormat = (format: "excel" | "csv" | "json" | "sql") => {
    if (!generatedData) return;
    
    let content: string;
    let mimeType: string;
    let extension: string;
    
    switch (format) {
      case "csv":
        const headers = generatedData.fields.join(",");
        const rows = generatedData.records.map(record => 
          generatedData.fields.map(field => 
            `"${(record[field] || '').toString().replace(/"/g, '""')}"`
          ).join(",")
        );
        content = [headers, ...rows].join("\n");
        mimeType = "text/csv";
        extension = "csv";
        break;
        
      case "json":
        content = JSON.stringify(generatedData, null, 2);
        mimeType = "application/json";
        extension = "json";
        break;
        
      case "sql":
        const tableName = `${selectedDomain}_${selectedSubDomain?.id || "data"}`;
        const columns = generatedData.fields.join(", ");
        const values = generatedData.records.map(record => 
          `(${generatedData.fields.map(field => {
            const val = record[field];
            if (val === null || val === undefined) return "NULL";
            if (typeof val === "number") return val;
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(", ")})`
        );
        content = `-- Synthetic Data Generated by ${brand.platformName}\n-- Domain: ${selectedDomain}\n-- Sub-Domain: ${selectedSubDomain?.name}\n-- Records: ${recordCount}\n\nINSERT INTO ${tableName} (${columns})\nVALUES\n${values.join(",\n")};\n`;
        mimeType = "text/plain";
        extension = "sql";
        break;
        
      default:
        return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDomain}_${selectedSubDomain?.id}_${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Data exported as ${format.toUpperCase()}`
    });
  };
  
  return (
    <div className="flex h-full bg-background">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      <div className="flex-1 flex flex-col overflow-hidden">
      <DashboardHeader />
      <main className="flex-1 overflow-auto">
        {/* Header + mode switcher: always constrained to keep it readable */}
        <div className="px-6 pt-6 pb-0 max-w-[1600px] mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                  <Database className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Synthetic Data</h1>
                  <p className="text-muted-foreground">Generate production-grade test datasets for any domain</p>
                </div>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              <button
                onClick={() => setActiveMode("template")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeMode === "template"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-from-template"
              >
                <Sparkles className="w-4 h-4" />
                From Template
              </button>
              <button
                onClick={() => setActiveMode("upload")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeMode === "upload"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-from-file"
              >
                <Upload className="w-4 h-4" />
                From Sample File
              </button>
              <button
                onClick={() => setActiveMode("history")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeMode === "history"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-history"
              >
                <History className="w-4 h-4" />
                History
              </button>
            </div>
          </div>

        </div>{/* end header wrapper */}

        {/* ── From Sample File Mode: full-width, just horizontal padding ── */}
        {activeMode === "upload" && (
          <div className="px-6 pb-6">
            <SampleFileUploadMode />
          </div>
        )}

        {/* ── History Mode ── */}
        {activeMode === "history" && (
          <div className="px-6 pb-6">
            <GenerationHistoryView onNavigateToUpload={() => setActiveMode("upload")} />
          </div>
        )}

        {/* ── From Template Mode: keep readable max-width ── */}
        {activeMode === "template" && (
        <div className="px-6 pb-6 max-w-[1600px] mx-auto">
        <div className="space-y-6">
            {/* Compact Domain & Entity Selection Row */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Domain Selector - Pills when multiple, Badge when single */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">Domain:</span>
                    {filteredDomains.length === 1 ? (
                      // Single domain - show as selected badge
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 border border-violet-500/40 rounded-full">
                        <div className="text-violet-400">
                          {getDomainIcon(filteredDomains[0].icon)}
                        </div>
                        <span className="font-medium text-sm text-violet-400">{filteredDomains[0].name}</span>
                      </div>
                    ) : (
                      // Multiple domains - show as selectable pills
                      filteredDomains.map((domain) => (
                        <button
                          key={domain.id}
                          onClick={() => handleDomainSelect(domain.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                            selectedDomain === domain.id 
                              ? "bg-violet-500 text-white" 
                              : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                          }`}
                          data-testid={`domain-card-${domain.id}`}
                        >
                          {getDomainIcon(domain.icon)}
                          {domain.name}
                        </button>
                      ))
                    )}
                  </div>
                  
                  {/* Entity Type Selector - Horizontal Pills */}
                  {currentDomain && (
                    <>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground mr-1">Entity:</span>
                        {currentDomain.subDomains.map((subDomain) => (
                          <button
                            key={subDomain.id}
                            onClick={() => handleSubDomainSelect(subDomain)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              selectedSubDomain?.id === subDomain.id 
                                ? "bg-cyan-500 text-white" 
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                            }`}
                            data-testid={`subdomain-card-${subDomain.id}`}
                          >
                            {subDomain.name}
                            <span className="ml-1.5 text-xs opacity-70">({subDomain.fieldCount})</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Main Content Grid - Fields and Configuration Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
              
              {selectedSubDomain && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Settings2 className="w-5 h-5 text-violet-400" />
                        Step 3: Configure Fields
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="selectAll"
                          checked={selectedFields.size === allAvailableFields.length}
                          onCheckedChange={handleSelectAllFields}
                          data-testid="checkbox-select-all"
                        />
                        <Label htmlFor="selectAll" className="text-sm">
                          Select All ({selectedFields.size}/{allAvailableFields.length})
                        </Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-lg">
                      <Brain className="w-5 h-5 text-violet-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">AI-Powered Generation</p>
                        <p className="text-xs text-muted-foreground">Use Claude AI for intelligent, context-aware data generation</p>
                      </div>
                      <Checkbox
                        id="useLLM"
                        checked={useLLMGeneration}
                        onCheckedChange={(checked) => setUseLLMGeneration(checked as boolean)}
                        data-testid="checkbox-llm-mode"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Custom Field
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter field name (e.g., Customer_Loyalty_Tier)"
                          value={newCustomField}
                          onChange={(e) => setNewCustomField(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddCustomField()}
                          className="flex-1"
                          data-testid="input-custom-field"
                        />
                        <Button
                          onClick={handleAddCustomField}
                          size="sm"
                          disabled={!newCustomField.trim()}
                          data-testid="button-add-custom-field"
                        >
                          <Wand2 className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      {customFields.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {customFields.map((field) => (
                            <Badge
                              key={field}
                              variant="secondary"
                              className="bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1"
                            >
                              <Wand2 className="w-3 h-3" />
                              {field.replace(/_/g, " ")}
                              <button
                                onClick={() => handleRemoveCustomField(field)}
                                className="ml-1 hover:text-violet-100"
                                data-testid={`button-remove-${field}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <ScrollArea className="h-48 border rounded-lg p-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {allAvailableFields.map((field) => (
                          <div
                            key={field}
                            className={`flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer ${
                              customFields.includes(field) ? "bg-violet-500/10 border border-violet-500/20" : ""
                            }`}
                            onClick={() => handleFieldToggle(field)}
                          >
                            <Checkbox
                              checked={selectedFields.has(field)}
                              onCheckedChange={() => handleFieldToggle(field)}
                              data-testid={`checkbox-field-${field}`}
                            />
                            <span className="text-sm truncate flex items-center gap-1">
                              {customFields.includes(field) && <Wand2 className="w-3 h-3 text-violet-400" />}
                              {field.replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
              
              {generatedData && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Check className="w-5 h-5 text-green-400" />
                      Generated Data Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4 mb-4">
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-violet-400">
                          {generatedData.metadata.recordCount}
                        </div>
                        <div className="text-xs text-muted-foreground">Records</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-cyan-400">
                          {generatedData.metadata.fieldCount}
                        </div>
                        <div className="text-xs text-muted-foreground">Fields</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {generatedData.metadata.qualityScore || 98}%
                        </div>
                        <div className="text-xs text-muted-foreground">Quality</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-amber-400">
                          {processingTime.toFixed(2)}s
                        </div>
                        <div className="text-xs text-muted-foreground">Time</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-1">
                          {generatedData.metadata.generationMethod === "ai-powered" ? (
                            <Brain className="w-5 h-5 text-violet-400" />
                          ) : (
                            <Settings2 className="w-5 h-5 text-cyan-400" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {generatedData.metadata.generationMethod === "ai-powered" ? "AI" : "Rules"}
                        </div>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-64 border rounded-lg">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              {generatedData.fields.slice(0, 6).map((field) => (
                                <th key={field} className="p-2 text-left font-medium whitespace-nowrap">
                                  {field.replace(/_/g, " ")}
                                </th>
                              ))}
                              {generatedData.fields.length > 6 && (
                                <th className="p-2 text-left font-medium">...</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {generatedData.records.slice(0, 10).map((record, idx) => (
                              <tr key={idx} className="border-t border-border/50 hover:bg-muted/30">
                                {generatedData.fields.slice(0, 6).map((field) => (
                                  <td key={field} className="p-2 whitespace-nowrap">
                                    {String(record[field] || "")}
                                  </td>
                                ))}
                                {generatedData.fields.length > 6 && (
                                  <td className="p-2">...</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToFormat("csv")}
                        data-testid="button-export-csv"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToFormat("json")}
                        data-testid="button-export-json"
                      >
                        <FileJson className="w-4 h-4 mr-2" />
                        JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToFormat("sql")}
                        data-testid="button-export-sql"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        SQL
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings2 className="w-5 h-5 text-violet-400" />
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recordCount">Number of Records</Label>
                    <Input
                      id="recordCount"
                      type="number"
                      value={recordCount}
                      onChange={(e) => setRecordCount(parseInt(e.target.value) || 100)}
                      min={1}
                      max={50000}
                      placeholder="1-50,000"
                      data-testid="input-record-count"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dataPrefix">Data Prefix (Optional)</Label>
                    <Input
                      id="dataPrefix"
                      value={dataPrefix}
                      onChange={(e) => setDataPrefix(e.target.value)}
                      placeholder="e.g., TEST, DEMO, QA"
                      maxLength={10}
                      data-testid="input-data-prefix"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="masking"
                      checked={maskingEnabled}
                      onCheckedChange={(checked) => setMaskingEnabled(!!checked)}
                      data-testid="checkbox-masking"
                    />
                    <Label htmlFor="masking" className="text-sm cursor-pointer">
                      Enable Data Masking
                    </Label>
                  </div>
                  
                  {maskingEnabled && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-200">
                      Sensitive fields (names, IDs, emails) will be masked with format preservation
                    </div>
                  )}
                  
                  <Button
                    className="w-full"
                    onClick={generateSyntheticData}
                    disabled={!selectedSubDomain || selectedFields.size === 0 || isGenerating}
                    data-testid="button-generate"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Test Data
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
              
              {selectedSubDomain && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Selection Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Domain:</span>
                      <span className="font-medium">{currentDomain?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Entity:</span>
                      <span className="font-medium">{selectedSubDomain.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fields:</span>
                      <span className="font-medium">{selectedFields.size} selected</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Records:</span>
                      <span className="font-medium">{recordCount.toLocaleString()}</span>
                    </div>
                    {dataPrefix && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prefix:</span>
                        <span className="font-medium">{dataPrefix}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
        </div>
        )}
      </main>
      </div>
    </div>
  );
}
