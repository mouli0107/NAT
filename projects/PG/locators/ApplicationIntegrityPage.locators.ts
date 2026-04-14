import { Page, Locator } from '@playwright/test';

export const ApplicationIntegrityPageLocators = {
  // Uniqueness: verify - may appear in footer | Stability: stable | Fallback: //nav//a[contains(@href, 'store')]
  storeLink: (page: Page): Locator => page.locator("xpath=//main//list//a[normalize-space(text())='Store']"),
  
  // Uniqueness: verify - may appear in footer | Stability: stable | Fallback: //a[contains(@href, 'support.smartbear.com')]
  supportLink: (page: Page): Locator => page.locator("xpath=//main//list//a[normalize-space(text())='Support']"),
  
  // Uniqueness: verify - may appear in footer | Stability: stable | Fallback: //nav//a[text()='Login']
  loginLink: (page: Page): Locator => page.locator("xpath=//main//list//a[normalize-space(text())='Login']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[contains(@href, '/') and .//img]
  homeLink: (page: Page): Locator => page.locator("xpath=//navigation//a[normalize-space(text())='Home']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[@href='#' and .//img]
  searchLink: (page: Page): Locator => page.locator("xpath=//navigation//a[normalize-space(text())='Search']"),
  
  // Uniqueness: verify - appears twice | Stability: stable | Fallback: //a[contains(@href, '/product')]
  getStartedLink: (page: Page): Locator => page.locator("xpath=//navigation//a[normalize-space(text())='Get Started']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[text()='AI']
  aiButton: (page: Page): Locator => page.locator("xpath=//navigation//button[normalize-space(text())='AI']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[text()='Products']
  productsButton: (page: Page): Locator => page.locator("xpath=//navigation//button[normalize-space(text())='Products']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[text()='Resources']
  resourcesButton: (page: Page): Locator => page.locator("xpath=//navigation//button[normalize-space(text())='Resources']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[contains(text(), 'SmartBear')]
  whySmartBearButton: (page: Page): Locator => page.locator("xpath=//navigation//button[normalize-space(text())='Why SmartBear']"),
  
  // Uniqueness: unique | Stability: fragile - marketing copy changes | Fallback: //main//h1
  mainHeading: (page: Page): Locator => page.locator("xpath=//main//h1[normalize-space(text())='The New Standard for Quality in the AI Era']"),
  
  // Uniqueness: unique | Stability: stable - structural | Fallback: //main//h1[1]
  mainHeadingStructural: (page: Page): Locator => page.locator("xpath=//main//h1[1]"),
  
  // Uniqueness: verify - appears twice | Stability: stable | Fallback: //main//a[contains(@href, 'product') and contains(text(), 'Explore')]
  exploreProductsLink: (page: Page): Locator => page.locator("xpath=//main//a[normalize-space(text())='Explore products' and contains(@href, '/product/')]"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(), 'integrity')]
  applicationIntegrityButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Application integrity']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h2[contains(text(), 'forces reshaping')]
  forcesReshapingHeading: (page: Page): Locator => page.locator("xpath=//main//h2[normalize-space(text())='The forces reshaping software quality']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h3[contains(text(), 'build software')]
  howYouBuildHeading: (page: Page): Locator => page.locator("xpath=//main//h3[normalize-space(text())='How you build software has forever transformed.']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h3[contains(text(), 'uses your software')]
  whoUsesHeading: (page: Page): Locator => page.locator("xpath=//main//h3[normalize-space(text())='Who uses your software has fundamentally changed.']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h3[contains(text(), 'Volume and velocity')]
  volumeVelocityHeading: (page: Page): Locator => page.locator("xpath=//main//h3[normalize-space(text())='Volume and velocity are crushing your controls.']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h3[contains(text(), 'see what AI')]
  cantSeeAIHeading: (page: Page): Locator => page.locator("xpath=//main//h3[normalize-space(text())=\"You can't see what AI is building.\"]"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h2[contains(text(), 'What is')]
  whatIsAppIntegrityHeading: (page: Page): Locator => page.locator("xpath=//main//h2[normalize-space(text())='What is application integrity?']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href, 'what-is-application-integrity')]
  readMoreLink: (page: Page): Locator => page.locator("xpath=//main//a[normalize-space(text())='Read more' and contains(@href, '/what-is-application-integrity/')]"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h2[contains(text(), 'Your AI journey')]
  aiJourneyHeading: (page: Page): Locator => page.locator("xpath=//main//h2[normalize-space(text())='Your AI journey']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h2[contains(text(), 'Levels of Autonomy')]
  levelsOfAutonomyHeading: (page: Page): Locator => page.locator("xpath=//main//h2[normalize-space(text())='Levels of Autonomy']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(), 'Level 1') and contains(text(), 'Connected')]
  level1ConnectedButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Level 1: Connected Automation']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(), 'Level 2') and contains(text(), 'On-Demand')]
  level2OnDemandButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Level 2: On-Demand']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(), 'Level 3') and contains(text(), 'Responsive')]
  level3ResponsiveButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Level 3: Responsive']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(), 'Level 4') and contains(text(), 'Directed')]
  level4DirectedButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Level 4: Directed']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(), 'Level 5') and contains(text(), 'Authorized')]
  level5AuthorizedButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Level 5: Authorized']"),
  
  // Uniqueness: verify - multiple level buttons | Stability: stable | Fallback: //button[text()='Level 1']
  level1NavigationButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Level 1' and not(contains(text(), ':'))]"),
  
  // Uniqueness: verify - multiple level buttons | Stability: stable | Fallback: //button[text()='Level 2']
  level2NavigationButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Level 2' and not(contains(text(), ':'))]"),
  
  // Uniqueness: verify - multiple level buttons | Stability: stable | Fallback: //button[text()='Level 3']
  level3NavigationButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Level 3' and not(contains(text(), ':'))]"),
  
  // Uniqueness: verify - multiple level buttons | Stability: stable | Fallback: //button[text()='Level 4']
  level4NavigationButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Level 4' and not(contains(text(), ':'))]"),
  
  // Uniqueness: verify - multiple level buttons | Stability: stable | Fallback: //button[text()='Level 5']
  level5NavigationButton: (page: Page): Locator => page.locator("xpath=//main//button[normalize-space(text())='Level 5' and not(contains(text(), ':'))]"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h3[contains(text(), 'Humans build')]
  humansBuildHeading: (page: Page): Locator => page.locator("xpath=//main//h3[normalize-space(text())='Humans build, technology repeats.']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h2[contains(text(), 'SmartBear brings')]
  smartBearBringsHeading: (page: Page): Locator => page.locator("xpath=//main//h2[normalize-space(text())='SmartBear brings application integrity to life']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h3[text()='Cloud']
  cloudHeading: (page: Page): Locator => page.locator("xpath=//main//h3[normalize-space(text())='Cloud']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h3[text()='On-premises']
  onPremisesHeading: (page: Page): Locator => page.locator("xpath=//main//h3[normalize-space(text())='On-premises']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h3[text()='Mobile']
  mobileHeading: (page: Page): Locator => page.locator("xpath=//main//h3[normalize-space(text())='Mobile']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h2[contains(text(), 'Application integrity at work')]
  appIntegrityAtWorkHeading: (page: Page): Locator => page.locator("xpath=//main//h2[normalize-space(text())='Application integrity at work']"),
  
  // Uniqueness: verify - second appearance | Stability: stable | Fallback: (//main//a[contains(@href, '/product/')])[2]
  exploreProductsLinkBottom: (page: Page): Locator => page.locator("xpath=(//main//a[normalize-space(text())='Explore products' and contains(@href, '/product/')])[2]"),
};