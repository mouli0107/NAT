import { Page } from '@playwright/test';
import { En-inPage } from '../pages/En-inPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executetestWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.microsoft.com/en-in');
  await prepareSite(page);

  const en-inPage = new En-inPage(page);
  await en-inPage.clickAllMicrosoft();
  await en-inPage.clickWindowsApps();
  await page.waitForURL('**https://login.live.com/oauth20_authorize.srf?client_id=10fa57ef-4895-4ab2-872c-8c3613d4f7fb&scope=openid+profile+offline_access&redirect_uri=https%3a%2f%2fwww.microsoft.com%2fcascadeauth%2faccount%2fsignin-oidc&response_type=code&state=CfDJ8DWlakf9i-pGinh129Xmw19qJzleX_YhkJ6aka4LvUQPCBroXfmqfq2aVYugm2wr5Pehb3QixijsywCgwvu5CB7ibWKcgb2Fa_FlGRPzbYd3NRza3klVH3EVPWDZ8NmTejdBKDYhXUJbyyY9SuqqoyiKDHfGoXHNIJNxtWX3E7bBFMe1k-0GZmYgJ_O9Ugz9nIB3zQjoW_79ESr5e7Zkv9a21JGr9ymhatBAjWmTu5ZB0FG7ARmFTVqcL2q0pvc33Nrz8jiOKnWpwBQtnujUhjhSEigVEarIOOJTltWyc9_aZhKWm7PIENDu1hSKE2JX_06uwRjRFTOUP_ipWrmrtcdAuc9yW6xmoosCgvC9VJa6eyuTnMR9wpJbmUvFD-V1ShVxqC-ewxlld6zC6labOvQA1fAmH-5AuMsDdsvfkju0qvyyGVSbeRNyULoWeSq3u0DBTpEr4ai1TqC8yQExMPP-NGOwrQVFwvBAq7gS4dnI_b18i6T59jEh8X4fRSzX-WJTObjD3OrQFYxtqN_wOQE&response_mode=form_post&nonce=639123464307266980.MzY1ZTY2NmQtYzMzMy00ZWJmLTgxMmYtMjhmMjRhMTY5NGYzODlkMjNkNzYtM2VhOS00YWJmLWE0YjMtMmRjNzI5Yjc2Y2Nk&prompt=none&code_challenge=SSu3aSEeoUD1Rl8-jp0v9dWq0CdjGuPKjR61MazI_uo&code_challenge_method=S256&x-client-SKU=ID_NET6_0&x-client-Ver=8.11.0.0&uaid=1989816fe389468598287d0f3ac0d3dd&msproxy=1&issuer=mso&tenant=consumers&ui_locales=en-US&client_info=1&epctrc=icci%2bgNT3fqWVHI%2fu9u9eJcSxtKh0p%2fxOpciJUawhpI%3d5%3a1%3aCANARY%3a%2bNB1twDsKyW%2bYUaP5yyuDKq1zWkD%2bFV2YYF9UJ4a4Mg%3d&epct=PAQABDgEAAACvnsHKEvvRQb3Bz3Qc7wnaRXZvU3RzQXJ0aWZhY3RzCAAAAAAAexrvojt5KPhJwW0G27yxliPwPDU-VMkV3_00mkrhuKWr_ZeiEQVjbP7UVXz4kdp90s70eLMLGGIF7QSG7OCmNsODKMZDJwaZ5Slh4U-GqClm2HzfzUGfsWUItxox8y_cbmGtzZfUhTZE0L6JVC8AEgdtVy_2KgcRxfv23LQMSZkQStqLuPcCCIWCFUsp03GUktQ0RnF_DkAiapHueEyI1yAA&jshs=0&claims=%7b%22compact%22%3a%7b%22name%22%3a%7b%22essential%22%3atrue%7d%7d%7d#', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://apps.microsoft.com/home?hl=en-US&gl=IN', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://apps.microsoft.com/redirect.html#error=login_required&error_description=Silent+authentication+was+denied.+The+user+must+first+sign+in+and+if+needed+grant+the+client+application+access+to+the+scope+'User.Read+openid+profile+offline_access'.&state=eyJpZCI6IjAxOWRhZTg3LWUzNmItN2I5NS05MjRjLWY5ZTBhZmYxMDY0NiIsIm1ldGEiOnsiaW50ZXJhY3Rpb25UeXBlIjoic2lsZW50In19', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://apps.microsoft.com/detail/xp8k17rnmm8mtn?hl=en-US&gl=IN', { waitUntil: 'domcontentloaded' });
}
