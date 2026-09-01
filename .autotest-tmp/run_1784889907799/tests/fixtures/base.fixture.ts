import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { LoginPage } from '../pages/login.page';
import { SigninPage } from '../pages/signin.page';
import { SignInPage } from '../pages/sign_in.page';
import { RegisterPage } from '../pages/register.page';
import { SignupPage } from '../pages/signup.page';
import { SignUpPage } from '../pages/sign_up.page';
import { LogoutPage } from '../pages/logout.page';
import { SignoutPage } from '../pages/signout.page';
import { DashboardPage } from '../pages/dashboard.page';
import { AdminPage } from '../pages/admin.page';
import { ProfilePage } from '../pages/profile.page';
import { AccountPage } from '../pages/account.page';
import { SettingsPage } from '../pages/settings.page';
import { AboutPage } from '../pages/about.page';
import { AboutUsPage } from '../pages/about_us.page';
import { ContactPage } from '../pages/contact.page';
import { ContactUsPage } from '../pages/contact_us.page';
import { HelpPage } from '../pages/help.page';
import { FaqPage } from '../pages/faq.page';
import { SupportPage } from '../pages/support.page';
import { PrivacyPage } from '../pages/privacy.page';
import { PrivacyPolicyPage } from '../pages/privacy_policy.page';
import { TermsPage } from '../pages/terms.page';
import { TermsOfServicePage } from '../pages/terms_of_service.page';
import { TosPage } from '../pages/tos.page';
import { SearchPage } from '../pages/search.page';
import { CartPage } from '../pages/cart.page';
import { CartHtmlPage } from '../pages/cart_html.page';
import { CheckoutPage } from '../pages/checkout.page';
import { CheckoutHtmlPage } from '../pages/checkout_html.page';
import { CheckoutStepOneHtmlPage } from '../pages/checkout_step_one_html.page';
import { CheckoutStepTwoHtmlPage } from '../pages/checkout_step_two_html.page';
import { CheckoutCompleteHtmlPage } from '../pages/checkout_complete_html.page';
import { InventoryHtmlPage } from '../pages/inventory_html.page';
import { InventoryItemHtmlPage } from '../pages/inventory_item_html.page';
import { ProductsPage } from '../pages/products.page';
import { ServicesPage } from '../pages/services.page';
import { ProductsHtmlPage } from '../pages/products_html.page';
import { BlogPage } from '../pages/blog.page';
import { NewsPage } from '../pages/news.page';
import { P404Page } from '../pages/_404.page';
import { ErrorPage } from '../pages/error.page';
import { CaseStudiesPage } from '../pages/case_studies.page';
import { CareersPage } from '../pages/careers.page';
import { SoftwareProductEngineeringPage } from '../pages/software_product_engineering.page';
import { FullPlatformAt60PercentCostPage } from '../pages/full_platform_at_60_percent_cost.page';
import { P50PercentBetterDetectionInTheAmbulancePage } from '../pages/_50_percent_better_detection_in_the_ambulance.page';
import { DigitalBankingAppsPage } from '../pages/digital_banking_apps.page';
import { SupplyChainTesting8xFasterPage } from '../pages/supply_chain_testing_8x_faster.page';

type PageFixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  signinPage: SigninPage;
  sign_inPage: SignInPage;
  registerPage: RegisterPage;
  signupPage: SignupPage;
  sign_upPage: SignUpPage;
  logoutPage: LogoutPage;
  signoutPage: SignoutPage;
  dashboardPage: DashboardPage;
  adminPage: AdminPage;
  profilePage: ProfilePage;
  accountPage: AccountPage;
  settingsPage: SettingsPage;
  aboutPage: AboutPage;
  about_usPage: AboutUsPage;
  contactPage: ContactPage;
  contact_usPage: ContactUsPage;
  helpPage: HelpPage;
  faqPage: FaqPage;
  supportPage: SupportPage;
  privacyPage: PrivacyPage;
  privacy_policyPage: PrivacyPolicyPage;
  termsPage: TermsPage;
  terms_of_servicePage: TermsOfServicePage;
  tosPage: TosPage;
  searchPage: SearchPage;
  cartPage: CartPage;
  cart_htmlPage: CartHtmlPage;
  checkoutPage: CheckoutPage;
  checkout_htmlPage: CheckoutHtmlPage;
  checkout_step_one_htmlPage: CheckoutStepOneHtmlPage;
  checkout_step_two_htmlPage: CheckoutStepTwoHtmlPage;
  checkout_complete_htmlPage: CheckoutCompleteHtmlPage;
  inventory_htmlPage: InventoryHtmlPage;
  inventory_item_htmlPage: InventoryItemHtmlPage;
  productsPage: ProductsPage;
  servicesPage: ServicesPage;
  products_htmlPage: ProductsHtmlPage;
  blogPage: BlogPage;
  newsPage: NewsPage;
  _404Page: P404Page;
  errorPage: ErrorPage;
  case_studiesPage: CaseStudiesPage;
  careersPage: CareersPage;
  software_product_engineeringPage: SoftwareProductEngineeringPage;
  full_platform_at_60_percent_costPage: FullPlatformAt60PercentCostPage;
  _50_percent_better_detection_in_the_ambulancePage: P50PercentBetterDetectionInTheAmbulancePage;
  digital_banking_appsPage: DigitalBankingAppsPage;
  supply_chain_testing_8x_fasterPage: SupplyChainTesting8xFasterPage;
};

export const test = base.extend<PageFixtures>({
    homePage: async ({ page }, use) => { await use(new HomePage(page)); },
    loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
    signinPage: async ({ page }, use) => { await use(new SigninPage(page)); },
    sign_inPage: async ({ page }, use) => { await use(new SignInPage(page)); },
    registerPage: async ({ page }, use) => { await use(new RegisterPage(page)); },
    signupPage: async ({ page }, use) => { await use(new SignupPage(page)); },
    sign_upPage: async ({ page }, use) => { await use(new SignUpPage(page)); },
    logoutPage: async ({ page }, use) => { await use(new LogoutPage(page)); },
    signoutPage: async ({ page }, use) => { await use(new SignoutPage(page)); },
    dashboardPage: async ({ page }, use) => { await use(new DashboardPage(page)); },
    adminPage: async ({ page }, use) => { await use(new AdminPage(page)); },
    profilePage: async ({ page }, use) => { await use(new ProfilePage(page)); },
    accountPage: async ({ page }, use) => { await use(new AccountPage(page)); },
    settingsPage: async ({ page }, use) => { await use(new SettingsPage(page)); },
    aboutPage: async ({ page }, use) => { await use(new AboutPage(page)); },
    about_usPage: async ({ page }, use) => { await use(new AboutUsPage(page)); },
    contactPage: async ({ page }, use) => { await use(new ContactPage(page)); },
    contact_usPage: async ({ page }, use) => { await use(new ContactUsPage(page)); },
    helpPage: async ({ page }, use) => { await use(new HelpPage(page)); },
    faqPage: async ({ page }, use) => { await use(new FaqPage(page)); },
    supportPage: async ({ page }, use) => { await use(new SupportPage(page)); },
    privacyPage: async ({ page }, use) => { await use(new PrivacyPage(page)); },
    privacy_policyPage: async ({ page }, use) => { await use(new PrivacyPolicyPage(page)); },
    termsPage: async ({ page }, use) => { await use(new TermsPage(page)); },
    terms_of_servicePage: async ({ page }, use) => { await use(new TermsOfServicePage(page)); },
    tosPage: async ({ page }, use) => { await use(new TosPage(page)); },
    searchPage: async ({ page }, use) => { await use(new SearchPage(page)); },
    cartPage: async ({ page }, use) => { await use(new CartPage(page)); },
    cart_htmlPage: async ({ page }, use) => { await use(new CartHtmlPage(page)); },
    checkoutPage: async ({ page }, use) => { await use(new CheckoutPage(page)); },
    checkout_htmlPage: async ({ page }, use) => { await use(new CheckoutHtmlPage(page)); },
    checkout_step_one_htmlPage: async ({ page }, use) => { await use(new CheckoutStepOneHtmlPage(page)); },
    checkout_step_two_htmlPage: async ({ page }, use) => { await use(new CheckoutStepTwoHtmlPage(page)); },
    checkout_complete_htmlPage: async ({ page }, use) => { await use(new CheckoutCompleteHtmlPage(page)); },
    inventory_htmlPage: async ({ page }, use) => { await use(new InventoryHtmlPage(page)); },
    inventory_item_htmlPage: async ({ page }, use) => { await use(new InventoryItemHtmlPage(page)); },
    productsPage: async ({ page }, use) => { await use(new ProductsPage(page)); },
    servicesPage: async ({ page }, use) => { await use(new ServicesPage(page)); },
    products_htmlPage: async ({ page }, use) => { await use(new ProductsHtmlPage(page)); },
    blogPage: async ({ page }, use) => { await use(new BlogPage(page)); },
    newsPage: async ({ page }, use) => { await use(new NewsPage(page)); },
    _404Page: async ({ page }, use) => { await use(new P404Page(page)); },
    errorPage: async ({ page }, use) => { await use(new ErrorPage(page)); },
    case_studiesPage: async ({ page }, use) => { await use(new CaseStudiesPage(page)); },
    careersPage: async ({ page }, use) => { await use(new CareersPage(page)); },
    software_product_engineeringPage: async ({ page }, use) => { await use(new SoftwareProductEngineeringPage(page)); },
    full_platform_at_60_percent_costPage: async ({ page }, use) => { await use(new FullPlatformAt60PercentCostPage(page)); },
    _50_percent_better_detection_in_the_ambulancePage: async ({ page }, use) => { await use(new P50PercentBetterDetectionInTheAmbulancePage(page)); },
    digital_banking_appsPage: async ({ page }, use) => { await use(new DigitalBankingAppsPage(page)); },
    supply_chain_testing_8x_fasterPage: async ({ page }, use) => { await use(new SupplyChainTesting8xFasterPage(page)); },
});

export { expect };
