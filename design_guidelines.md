# Design Guidelines: Agent-Based Visual Regression Testing Platform

## Design Approach
**Reference-Based + Specification-Driven**: This dashboard draws inspiration from modern development tools like Linear, Vercel, and GitHub Actions for real-time process visualization, combined with detailed stakeholder specifications for a polished proof-of-concept demo.

## Color Palette
- **Background**: Deep navy (#0f172a) - primary background for sophisticated dark theme
- **Primary Accent**: Vibrant cyan (#06b6d4) - agent actions, in-progress states, interactive elements
- **Success State**: Emerald green (#10b981) - completed tasks, positive metrics
- **Alert/Issue State**: Amber (#f59e0b) - warnings, accessibility issues
- **Borders**: Subtle borders using rgba with low opacity (rgba(255, 255, 255, 0.1))
- **Text**: High contrast whites and grays for WCAG AA compliance

## Typography
- **Font Family**: "Geist" font family or system font stack (-apple-system, BlinkMacSystemFont, "Segoe UI")
- **Base Size**: 14px for body text
- **Task Titles**: 18px bold
- **Metadata/Timestamps**: 12px
- **Hierarchy**: Clear weight differentiation (400 regular, 600 semibold, 700 bold)

## Layout System
**Primary Structure**:
- Left Sidebar: Fixed 20% width with navigation and test configuration
- Main Content Area: 80% width for agent activity visualization
- **Spacing Unit**: 16px base grid (use Tailwind p-4, p-6, p-8 equivalents)
- Common spacing: 16px, 24px, 32px, 48px for section padding

## Component Library

### Navigation Sidebar
- Logo/brand centered at top with generous padding (p-6)
- Navigation items with active state highlighting (cyan border-left accent)
- "START DEMO" button at bottom: Large, full-width, cyan background with hover brightness increase
- Subtle background differentiation from main content (slightly lighter navy)

### Test Configuration Form
- Input fields: Dark backgrounds with cyan borders on focus
- Labels above inputs with 8px margin-bottom
- Dropdown menus with consistent styling
- Info text in muted gray (rgba(255, 255, 255, 0.6))
- "Begin Testing" button: Prominent cyan with loading state animation

### Agent Activity Timeline (Hero Element)
- **Vertical Timeline**: Centered vertical line with circular nodes
- **Node States**:
  - Pending: Gray circle (static)
  - In-Progress: Cyan circle with 2s rotation spinner
  - Completed: Green circle with checkmark and subtle 1.5s pulse
- **Task Cards**: Alternate left/right placement, 48px vertical spacing between cards
- **Card Design**:
  - Rounded corners (8px radius)
  - Subtle background (rgba(255, 255, 255, 0.05))
  - 16px padding
  - Hover state: Slight background brightening + subtle shadow
  - Task title (18px bold)
  - Agent badge with emoji icon (12px, colored background matching agent type)
  - Status detail text (14px, muted)
  - Timestamp (12px, right-aligned, very muted)

### Live Metrics Panel
- **Metric Cards**: Grid layout, 2 columns
- **Counter Display**: Large animated numbers (24px) with smooth increment transitions (500ms easing)
- **Emoji Icons**: 🎨 🔍 📸 ⚠️ positioned before labels
- **Circular Progress**: Small (32px) progress rings beside each metric
- **Real-time Updates**: Smooth number transitions, no jarring jumps

### Visual Comparison Preview
- **Split Screen**: 50/50 layout with 2px cyan divider line
- **Image Containers**: Equal height, contained images with object-fit cover
- **Labels**: "Figma Design (Baseline)" and "Live Website (Current)" above each side
- **Difference Highlights**: Red bounding boxes (2px border, rgba red with 0.3 opacity fill)
- **Zoom Animation**: Subtle 1.2x scale on difference areas with 300ms transition
- **Details Below**: Small text cards showing "4 differences detected in header region"

### Final Results Panel
- **Large Success Card**: Centered, max-width 600px
- **Title**: Large (24px) with green checkmark emoji
- **Completion Time**: Subtle gray subtext
- **Finding Cards**: 3-column grid with icon, metric, and label
- **Download Button**: Full-width cyan button with download icon

## Animations
- **Task Card Entry**: Fade-in with slight upward slide (300ms)
- **Node Spinner**: 2s continuous rotation for in-progress states
- **Completed Pulse**: 1.5s gentle scale pulse animation
- **Counter Increments**: Smooth easing transitions (500ms per increment)
- **Section Transitions**: Opacity fade (400ms) when switching views
- **Hover Effects**: 200ms transitions on brightness and shadow changes
- **Use Framer Motion**: For all complex animations and orchestration

## Accessibility
- Minimum contrast ratios exceed WCAG AA (4.5:1 for normal text)
- Focus states with cyan outline (2px solid)
- Keyboard navigation support for all interactive elements
- Screen reader friendly labels for agent status changes

## Professional Polish
- Subtle background gradient: Navy to slightly lighter navy (vertical)
- Smooth edges on all cards (8px border-radius standard)
- Consistent shadow hierarchy: Hover shadows more prominent
- No jarring animations - all movements smooth and purposeful
- Loading states use professional minimal spinners (cyan stroke)
- Desktop-optimized for 1920x1080 displays

## Key Interactions
1. User fills form → smooth transition to timeline view
2. Timeline populates incrementally → cards fade in sequentially
3. Metrics update in real-time → animated counters
4. Visual comparison appears mid-flow → slide-in from bottom
5. Final results appear → celebration animation with confetti-like subtle effect
6. "Run Another Test" resets → smooth fade-out/fade-in transition