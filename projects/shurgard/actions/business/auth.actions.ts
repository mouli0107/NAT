// Re-exported from Shurgard.actions — do not edit here
export {
  loginToShurgard,
  selectLocation,
  addNewCustomer,
} from './Shurgard.actions';

import { Page } from '@playwright/test';
import { TestData } from '../../fixtures/test-data';
import { loginToShurgard, selectLocation, addNewCustomer } from './Shurgard.actions';

/** Combined login + location select + add customer in one call */
export async function loginAndCreateCustomer(
  page: Page,
  data: {
    username?: string;
    password?: string;
    location?: string;
    store?: string;
    title?: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    dateOfBirth?: string;
  } = TestData.TC003
): Promise<void> {
  await loginToShurgard(page, data.username, data.password);
  await selectLocation(page, data.location, data.store);
  await addNewCustomer(page, {
    title:       data.title || '',
    firstName:   data.firstName,
    lastName:    data.lastName,
    phoneNumber: data.phoneNumber,
    email:       data.email,
    dateOfBirth: data.dateOfBirth || '',
  });
}

/** Login + location select only (no customer creation) */
export async function loginAndSelectLocation(
  page: Page,
  username = TestData.username,
  password = TestData.password,
  location = TestData.country,
  store    = TestData.location
): Promise<void> {
  await loginToShurgard(page, username, password);
  await selectLocation(page, location, store);
}
