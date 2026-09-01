import { Page } from '@playwright/test';
import { WwwPage } from '../pages/WwwPage';
import { CLSPOWERTOOLS7125Page } from '../pages/CLSPOWERTOOLS7125Page';
import { EngineeringPage } from '../pages/EngineeringPage';
import { Costs.htmlPage } from '../pages/Costs.htmlPage';
import { CLSHEALTHSAFETYPage } from '../pages/CLSHEALTHSAFETYPage';
import { CLSCONSTRUCTIONEXOSKELETONSPage } from '../pages/CLSCONSTRUCTIONEXOSKELETONSPage';
import { R14012433Page } from '../pages/R14012433Page';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executeHiltiWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.hilti.com/');
  await prepareSite(page);

  const wwwPage = new WwwPage(page);
  await wwwPage.clickAgreeAgreeToOurDataProcessin();
  await page.waitForURL('**https://www.hilti.com/c46ee7c6-5097-4339-8d53-ae0ac4f72319/_/service_worker/63b0/sw_iframe.html?origin=https%3A%2F%2Fwww.hilti.com&1p=1&path=%2Fc46ee7c6-5097-4339-8d53-ae0ac4f72319', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://13082830.fls.doubleclick.net/activityi;dc_pre=CLq7_Zfxo5QDFUS9YwYdLNA7uA;src=13082830;type=pagev;cat=pagev0;rcb=7;ord=6429776305774;npa=0;auiddc=303387422.1778043763;u1=false;u2=undefined;u3=undefined;u4=undefined;u5=false;u6=false;u7=undefined;u8=Homepage;u9=undefined;u10=undefined;gdid=dMTc4Zm;uaa=x86;uab=64;uafvl=Chromium%3B141.0.7390.37%7CNot%253FA_Brand%3B8.0.0.0;uamb=0;uam=;uap=Windows;uapv=10.0;uaw=0;pscdl=noapi;frm=0;_tu=KFA;gtm=45fe6541v9190369010z872146901za20gzb72146901zd72146901xea;gcs=G111;gcd=13n3n3n3n5l1;dma=0;dc_fmt=2;tcfd=1000g;tag_exp=0~115938466~115938469~116363097~118131810~118463261;epver=2;dc_random=1778043764_lGH_26xELnrJV6SoEt4juF3ib6l2NBResA;_dc_test=1;~oref=https%3A%2F%2Fwww.hilti.com%2F?', { waitUntil: 'domcontentloaded' });
  await wwwPage.clickProducts();
  await wwwPage.clickPowerTools();
  await page.waitForURL('**https://www.hilti.com/c/CLS_POWER_TOOLS_7125', { waitUntil: 'domcontentloaded' });
  const cLSPOWERTOOLS7125Page = new CLSPOWERTOOLS7125Page(page);
  await cLSPOWERTOOLS7125Page.clickChangeCountry();
  await page.waitForURL('**https://www.hilti.in/', { waitUntil: 'domcontentloaded' });
  await wwwPage.clickEngineeringCentre();
  await page.waitForURL('**https://www.hilti.in/c46ee7c6-5097-4339-8d53-ae0ac4f72319/_/service_worker/63b0/sw_iframe.html?origin=https%3A%2F%2Fwww.hilti.in&1p=1&path=%2Fc46ee7c6-5097-4339-8d53-ae0ac4f72319', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://undefined.fls.doubleclick.net/activityi;dc_pre=CL7kt6Txo5QDFXhRKgkd0LUmhA;src=undefined;type=pagev;cat=pagev0;rcb=12;ord=8509108105000;npa=0;auiddc=728024304.1778043790;u1=false;u2=undefined;u3=undefined;u4=undefined;u5=false;u6=false;u7=undefined;u8=Homepage;u9=undefined;u10=undefined;gdid=dMTc4Zm;uaa=x86;uab=64;uafvl=Chromium%3B141.0.7390.37%7CNot%253FA_Brand%3B8.0.0.0;uamb=0;uam=;uap=Windows;uapv=10.0;uaw=0;pscdl=noapi;frm=0;_tu=KFg;gtm=45fe6541z872146901za20gzb72146901zd72146901xea;gcs=G111;gcd=13t3t3t2t5l1;dma=0;dc_fmt=2;tcfd=1000g;tag_exp=0~115938465~115938468~116363098~118463262~118826471;epver=2;dc_random=1778043790_jVLbL0n7iERF73NlA0usoKTjAvZ_LaX0mQ;_dc_test=1;~oref=https%3A%2F%2Fwww.hilti.in%2F?', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.hilti.in/engineering', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.hilti.in/engineering/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://undefined.fls.doubleclick.net/activityi;dc_pre=CO2G1Kbxo5QDFazboAIdauoI4g;src=undefined;type=pagev;cat=pagev0;rcb=6;ord=1334141701082;npa=0;auiddc=728024304.1778043790;u1=undefined;u2=undefined;u3=undefined;u4=undefined;u5=undefined;u6=undefined;u7=undefined;u8=(template%20not%20provided);u9=undefined;u10=undefined;gdid=dMTc4Zm;uaa=x86;uab=64;uafvl=Chromium%3B141.0.7390.37%7CNot%253FA_Brand%3B8.0.0.0;uamb=0;uam=;uap=Windows;uapv=10.0;uaw=0;pscdl=noapi;frm=0;_tu=KFA;gtm=45fe6541z872146901za20gzb72146901zd72146901xea;gcs=G111;gcd=13t3t3t2t5l1;dma=0;dc_fmt=2;tcfd=1000g;tag_exp=0~115616985~115938466~115938469~116363097~118463261~118812177;epver=2;dc_random=1778043795_vBisdjNSGnRfh68tE0WDym7VGgqiaU5Kjg;_dc_test=1;~oref=https%3A%2F%2Fwww.hilti.in%2Fengineering%2F?', { waitUntil: 'domcontentloaded' });
  const engineeringPage = new EngineeringPage(page);
  await engineeringPage.clickBusinessOptimization();
  await page.waitForURL('**https://www.hilti.in/c46ee7c6-5097-4339-8d53-ae0ac4f72319/_/service_worker/63b0/sw_iframe.html?origin=https%3A%2F%2Fwww.hilti.in&1p=1&path=%2Fc46ee7c6-5097-4339-8d53-ae0ac4f72319', { waitUntil: 'domcontentloaded' });
  await engineeringPage.clickControlCosts();
  await page.waitForURL('**https://www.hilti.in/content/hilti/A2/IN/en/business/business/costs.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.hilti.in/c46ee7c6-5097-4339-8d53-ae0ac4f72319/_/service_worker/63b0/sw_iframe.html?origin=https%3A%2F%2Fwww.hilti.in&1p=1&path=%2Fc46ee7c6-5097-4339-8d53-ae0ac4f72319', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://undefined.fls.doubleclick.net/activityi;dc_pre=CNW0-qnxo5QDFQi9YwYdLUgV2g;src=undefined;type=pagev;cat=pagev0;rcb=12;ord=5236369369575;npa=0;auiddc=728024304.1778043790;u1=undefined;u2=undefined;u3=undefined;u4=undefined;u5=undefined;u6=undefined;u7=undefined;u8=(template%20not%20provided);u9=undefined;u10=undefined;gdid=dMTc4Zm;uaa=x86;uab=64;uafvl=Chromium%3B141.0.7390.37%7CNot%253FA_Brand%3B8.0.0.0;uamb=0;uam=;uap=Windows;uapv=10.0;uaw=0;pscdl=noapi;frm=0;_tu=KFA;gtm=45fe6541z872146901za20gzb72146901zd72146901xea;gcs=G111;gcd=13t3t3t2t5l1;dma=0;dc_fmt=2;tcfd=10000;tag_exp=0~115938466~115938468~116363097~117384406~118463261~118812177;epver=2;dc_random=1778043802_k_6wGomJMqJWXQSRa5w4o3o7kx7QzOrM9A;_dc_test=1;~oref=https%3A%2F%2Fwww.hilti.in%2Fcontent%2Fhilti%2FA2%2FIN%2Fen%2Fbusiness%2Fbusiness%2Fcosts.html?', { waitUntil: 'domcontentloaded' });
  const costs.htmlPage = new Costs.htmlPage(page);
  await costs.htmlPage.clickProducts();
  await costs.htmlPage.clickHealthAndSafety();
  await page.waitForURL('**https://www.hilti.in/c/CLS_HEALTH_SAFETY', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.hilti.in/c46ee7c6-5097-4339-8d53-ae0ac4f72319/_/service_worker/63b0/sw_iframe.html?origin=https%3A%2F%2Fwww.hilti.in&1p=1&path=%2Fc46ee7c6-5097-4339-8d53-ae0ac4f72319', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://undefined.fls.doubleclick.net/activityi;dc_pre=COu_867xo5QDFZCEYwYdUjYCDg;src=undefined;type=pagev;cat=pagev0;rcb=18;ord=5885711794184;npa=0;auiddc=728024304.1778043790;u1=undefined;u2=undefined;u3=undefined;u4=undefined;u5=undefined;u6=undefined;u7=undefined;u8=(template%20not%20provided);u9=undefined;u10=undefined;gdid=dMTc4Zm;uaa=x86;uab=64;uafvl=Chromium%3B141.0.7390.37%7CNot%253FA_Brand%3B8.0.0.0;uamb=0;uam=;uap=Windows;uapv=10.0;uaw=0;pscdl=noapi;frm=0;_tu=KFA;gtm=45fe6541z872146901za20gzb72146901zd72146901xea;gcs=G111;gcd=13t3t3t2t5l1;dma=0;dc_fmt=2;tcfd=10000;tag_exp=0~115938465~115938468~118128922~118289195~118463262;epver=2;dc_random=1778043812_lOj-TaU8u38nBaWmj9Z8Wl2d4XAyhPo7aA;_dc_test=1;~oref=https%3A%2F%2Fwww.hilti.in%2Fc%2FCLS_HEALTH_SAFETY?', { waitUntil: 'domcontentloaded' });
  const cLSHEALTHSAFETYPage = new CLSHEALTHSAFETYPage(page);
  await cLSHEALTHSAFETYPage.clickConstructionExoskeletons();
  await page.waitForURL('**https://www.hilti.in/c/CLS_HEALTH_SAFETY/CLS_CONSTRUCTION_EXOSKELETONS', { waitUntil: 'domcontentloaded' });
  const cLSCONSTRUCTIONEXOSKELETONSPage = new CLSCONSTRUCTIONEXOSKELETONSPage(page);
  await cLSCONSTRUCTIONEXOSKELETONSPage.clickExoSShoulderExoskeleton();
  await page.waitForURL('**https://www.hilti.in/c/CLS_HEALTH_SAFETY/CLS_CONSTRUCTION_EXOSKELETONS/r14012433', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.hilti.in/c/CLS_HEALTH_SAFETY/CLS_CONSTRUCTION_EXOSKELETONS/r14012433?itemCode=2331083&salespackquantity=1&activeTab=preconfigured-kits-tabs', { waitUntil: 'domcontentloaded' });
  const r14012433Page = new R14012433Page(page);
  await r14012433Page.clickAddToCart();
  await page.waitForURL('**https://undefined.fls.doubleclick.net/activityi;dc_pre=CKv7hLfxo5QDFaruOAYdkmUTiw;src=undefined;type=atc;cat=addto0;rcb=18;ord=234731356362;npa=0;auiddc=728024304.1778043790;u11=INR;u13=r14012433;u14=Infinity;u15=NORMAL;u16=undefined;gdid=dMTc4Zm;uaa=x86;uab=64;uafvl=Chromium%3B141.0.7390.37%7CNot%253FA_Brand%3B8.0.0.0;uamb=0;uam=;uap=Windows;uapv=10.0;uaw=0;pscdl=noapi;frm=0;_tu=KFg;gtm=45fe6541z872146901za20gzb72146901zd72146901xea;gcs=G111;gcd=13t3t3t2t5l1;dma=0;dc_fmt=2;tcfd=10000;tag_exp=0~115938465~115938468~118128922~118289195~118463262;epver=2;dc_random=1778043829_MXd3pzf5f9xuzQM0cEBBDez4iqozMOlGwQ;_dc_test=1;~oref=https%3A%2F%2Fwww.hilti.in%2Fc%2FCLS_HEALTH_SAFETY%2FCLS_CONSTRUCTION_EXOSKELETONS%2Fr14012433%3FitemCode%3D2331083%26salespackquantity%3D1%26activeTab%3Dpreconfigured-kits-tabs?', { waitUntil: 'domcontentloaded' });
}
