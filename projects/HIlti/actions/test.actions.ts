import { Page } from '@playwright/test';
import { WwwPage } from '../pages/WwwPage';
import { CLS_POWER_TOOLS_7125Page } from '../pages/CLS_POWER_TOOLS_7125Page';
import { CLS_ROTARY_HAMMERS_7125Page } from '../pages/CLS_ROTARY_HAMMERS_7125Page';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executetestWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.hilti.com/');
  await prepareSite(page);

  const wwwPage = new WwwPage(page);
  await wwwPage.clickAgreeAgreeToOurDataProcessin();
  await wwwPage.clickProducts();
  await page.waitForURL('**https://13082830.fls.doubleclick.net/activityi;dc_pre=CPuZrsDP_pMDFXGPrAIdeOoG5A;src=13082830;type=pagev;cat=pagev0;rcb=2;ord=592253776162;npa=0;auiddc=1617181469.1776763411;u1=false;u2=undefined;u3=undefined;u4=undefined;u5=false;u6=false;u7=undefined;u8=Homepage;u9=undefined;u10=undefined;gdid=dMTc4Zm;uaa=x86;uab=64;uafvl=Chromium%3B141.0.7390.37%7CNot%253FA_Brand%3B8.0.0.0;uamb=0;uam=;uap=Windows;uapv=10.0;uaw=0;pscdl=noapi;frm=0;_tu=KFA;gtm=45fe64h1v9190369010z872146901za20gzb72146901zd72146901xea;gcs=G111;gcd=13n3n3n3n5l1;dma=0;dc_fmt=2;tcfd=1000g;tag_exp=0~115938466~115938469~117266400~117884344;epver=2;dc_random=1776763412_eMDUmJx4DJ1M7XZkvDIwIfBLqSHPC0LRXQ;_dc_test=1;~oref=https%3A%2F%2Fwww.hilti.com%2F?', { waitUntil: 'domcontentloaded' });
  await wwwPage.clickPowerTools();
  await page.waitForURL('**https://www.hilti.com/c/CLS_POWER_TOOLS_7125', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://13082830.fls.doubleclick.net/activityi;dc_pre=CIaUnMLP_pMDFUeIrAIdMegGjQ;src=13082830;type=pagev;cat=pagev0;rcb=2;ord=8905882646248;npa=0;auiddc=1617181469.1776763411;u1=undefined;u2=undefined;u3=undefined;u4=undefined;u5=undefined;u6=undefined;u7=undefined;u8=(template%20not%20provided);u9=undefined;u10=undefined;gdid=dMTc4Zm;uaa=x86;uab=64;uafvl=Chromium%3B141.0.7390.37%7CNot%253FA_Brand%3B8.0.0.0;uamb=0;uam=;uap=Windows;uapv=10.0;uaw=0;pscdl=noapi;frm=0;_tu=KFA;gtm=45fe64h1v9190369010z872146901za20gzb72146901zd72146901xea;gcs=G111;gcd=13n3n3n3n5l1;dma=0;dc_fmt=2;tcfd=10000;tag_exp=0~115616986~115938465~115938468~117266400~117384406;epver=2;dc_random=1776763416_FvEfnm2kdc48DCDFcELXf4QFY8bgkL26CA;_dc_test=1;~oref=https%3A%2F%2Fwww.hilti.com%2Fc%2FCLS_POWER_TOOLS_7125?', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.hilti.com/c/CLS_POWER_TOOLS_7125', { waitUntil: 'domcontentloaded' });
  const cLS_POWER_TOOLS_7125Page = new CLS_POWER_TOOLS_7125Page(page);
  await cLS_POWER_TOOLS_7125Page.clickRotaryHammers();
  await page.waitForURL('**https://www.hilti.com/c46ee7c6-5097-4339-8d53-ae0ac4f72319/_/service_worker/63b0/sw_iframe.html?origin=https%3A%2F%2Fwww.hilti.com&1p=1&path=%2Fc46ee7c6-5097-4339-8d53-ae0ac4f72319', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.hilti.com/c/CLS_POWER_TOOLS_7125/CLS_ROTARY_HAMMERS_7125', { waitUntil: 'domcontentloaded' });
  const cLS_ROTARY_HAMMERS_7125Page = new CLS_ROTARY_HAMMERS_7125Page(page);
  await cLS_ROTARY_HAMMERS_7125Page.clickIndia();
  await cLS_ROTARY_HAMMERS_7125Page.clickJapan();
  await cLS_ROTARY_HAMMERS_7125Page.clickChangeCountry();
  await page.waitForURL('**https://www.hilti.co.jp/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.hilti.co.jp/c46ee7c6-5097-4339-8d53-ae0ac4f72319/_/service_worker/63b0/sw_iframe.html?origin=https%3A%2F%2Fwww.hilti.co.jp&1p=1&path=%2Fc46ee7c6-5097-4339-8d53-ae0ac4f72319', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://undefined.fls.doubleclick.net/activityi;dc_pre=CPO-q8rP_pMDFemkrAIdi8Mr4A;src=undefined;type=pagev;cat=pagev0;rcb=15;ord=757208561738;npa=0;auiddc=614321222.1776763431;u1=false;u2=undefined;u3=undefined;u4=undefined;u5=false;u6=false;u7=undefined;u8=Homepage;u9=undefined;u10=undefined;gdid=dMTc4Zm;uaa=x86;uab=64;uafvl=Chromium%3B141.0.7390.37%7CNot%253FA_Brand%3B8.0.0.0;uamb=0;uam=;uap=Windows;uapv=10.0;uaw=0;pscdl=noapi;frm=0;_tu=KFg;gtm=45fe64h1z872146901za20gzb72146901zd72146901xea;gcs=G111;gcd=13t3t3t3t5l1;dma=0;dc_fmt=2;tcfd=1000g;tag_exp=0~115616986~115938466~115938468~117266401;epver=2;dc_random=1776763432_NptKTuN7NrsL1nygI0kxTXVfji_wuUjVKw;_dc_test=1;~oref=https%3A%2F%2Fwww.hilti.co.jp%2F?', { waitUntil: 'domcontentloaded' });
}
