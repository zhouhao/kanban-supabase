# Xiandan Kanban Board Application UI/UX Design Specification

## 1. Design Overview

### 1.1 Product Positioning
"Xiandan Kanban" is a modern kanban management tool that adopts agile development concepts to provide users with intuitive and efficient task management experience.

### 1.2 Design Principles
- **Simple and Intuitive**: Clean interface with reduced cognitive load
- **Efficient and Convenient**: Complete core operations in shortest path
- **Visual Comfort**: Light blue theme creates relaxed atmosphere
- **Responsive**: Smooth interaction animations and instant feedback

### 1.3 Target Users
- Agile development teams
- Project management personnel
- Content creation teams
- Personal efficiency management users

## 2. Color System

### 2.1 Primary Colors (Light Blue Series)

#### Primary Colors
- **Primary Blue**: #3B82F6 (RGB: 59, 130, 246)
- **Primary Dark**: #2563EB (RGB: 37, 99, 235)
- **Primary Light**: #60A5FA (RGB: 96, 165, 250)

#### Secondary Colors
- **Secondary Blue**: #E0F2FE (RGB: 224, 242, 254)
- **Accent Blue**: #BAE6FD (RGB: 186, 230, 253)
- **Info Blue**: #0EA5E9 (RGB: 14, 165, 233)

#### Functional Colors
- **Success**: #10B981 (RGB: 16, 185, 129) - Success status
- **Warning**: #F59E0B (RGB: 245, 158, 11) - Warning status
- **Error**: #EF4444 (RGB: 239, 68, 68) - Error status
- **Neutral**: #6B7280 (RGB: 107, 114, 128) - Neutral text

#### Background Colors
- **Background**: #F8FAFC (RGB: 248, 250, 252)
- **Card Background**: #FFFFFF (RGB: 255, 255, 255)
- **Sidebar Background**: #F1F5F9 (RGB: 241, 245, 249)

### 2.2 Gradients
- **Primary Gradient**: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)
- **Card Hover**: linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)
- **Success Gradient**: linear-gradient(135deg, #10B981 0%, #34D399 100%)

### 2.3 Text Colors
- **Primary Text**: #1F2937 (RGB: 31, 41, 55)
- **Secondary Text**: #6B7280 (RGB: 107, 114, 128)
- **Auxiliary Text**: #9CA3AF (RGB: 156, 163, 175)
- **Inverted Text**: #FFFFFF (RGB: 255, 255, 255)

## 3. Layout Design

### 3.1 Full-screen Kanban Layout

#### Top Navigation Bar (Header)
- **Height**: 64px
- **Background**: White, bottom 1px border #E5E7EB
- **Content**: Logo, navigation menu, user avatar, notification button

#### Sidebar
- **Width**: 280px (expanded) / 64px (collapsed)
- **Background**: #F1F5F9
- **Collapse Animation**: 300ms ease-in-out
- **Function**: Project switching, board list, user settings

#### Main Board Area (Main Board)
- **Minimum Columns**: 3 columns
- **Maximum Columns**: 8 columns (adaptive)
- **Column Spacing**: 24px
- **Card Spacing**: 16px

#### Column Design
- **Width**: Equal width filling, auto-calculation
- **Minimum Width**: 280px
- **Background**: White
- **Border Radius**: 8px
- **Shadow**: 0 1px 3px rgba(0, 0, 0, 0.1)

### 3.2 Card Component
- **Height**: Adaptive content
- **Minimum Height**: 80px
- **Border Radius**: 8px
- **Background**: White
- **Border**: 1px solid #E5E7EB
- **Hover Effect**: Slight upward movement + shadow deepening

## 4. Responsive Design

### 4.1 Breakpoint Settings
```css
/* Mobile Devices */
@media (max-width: 768px) { }

/* Tablet Devices */
@media (min-width: 769px) and (max-width: 1024px) { }

/* Desktop Devices */
@media (min-width: 1025px) { }

/* Large Desktop */
@media (min-width: 1440px) { }
```

### 4.2 Mobile Adaptation (≤768px)

#### Layout Adjustments
- **Hide Sidebar**: Changed to dropdown menu or sliding drawer
- **Column Layout**: Changed to horizontal scrolling single column display
- **Card Size**: Adapted for touch operations, minimum click area 44px
- **Navigation**: Bottom Tab navigation

#### Interaction Optimization
- **Drag and Drop**: Touch-friendly drag gestures
- **Gestures**: Support swipe, long press and other mobile gestures
- **Input**: Full-screen input popup

### 4.3 Desktop Optimization (≥1025px)

#### Layout Features
- **Multi-column Display**: Make full use of screen width
- **Keyboard Shortcuts**: Support keyboard shortcuts
- **Enhanced Drag and Drop**: Precise mouse drag and drop
- **Hover Effects**: Rich mouse hover feedback

#### Feature Enhancement
- **Context Menu**: Right-click menu support
- **Batch Operations**: Support multi-select and batch drag and drop
- **Preview Function**: Hover to show detailed preview

### 4.4 Adaptive Algorithm

#### Column Count Calculation
```javascript
// Pseudo code for calculating optimal column count
function calculateColumns(containerWidth) {
  const columnWidth = 280;
  const gap = 24;
  const maxColumns = Math.floor((containerWidth + gap) / (columnWidth + gap));
  return Math.max(3, Math.min(maxColumns, 8));
}
```

#### Card Density
- **Compact Mode**: Reduce spacing, display more content
- **Comfortable Mode**: Increase spacing, enhance reading experience
- **Auto Mode**: Automatically adjust based on screen size

## 5. Interaction Design Specification

### 5.1 Drag and Drop Interaction

#### Drag States
- **Idle**: Normal display
- **Drag Start**: Card semi-transparent, slight scale (scale: 0.95)
- **Dragging**: Card follows mouse, shows drag shadow
- **Drop Zone**: Target area highlighted
- **Release**: Smooth movement to target position

#### Drag Feedback
- **Visual Feedback**: Border highlight, shadow changes
- **Sound Feedback**: Optional drag sound effects
- **Haptic Feedback**: Mobile vibration feedback

### 5.2 Animation Standards

#### Easing Functions
- **Default**: cubic-bezier(0.4, 0.0, 0.2, 1) - smooth and natural
- **Fast**: cubic-bezier(0.0, 0.0, 0.2, 1) - quick response
- **Elastic**: cubic-bezier(0.68, -0.55, 0.265, 1.55) - elastic effect

#### Animation Duration
- **Quick**: 150ms (button clicks, simple state changes)
- **Standard**: 300ms (page transitions, card movements)
- **Slow**: 500ms (complex layout changes, modals)

#### Key Animations
- **Page Entry**: fadeIn + slideUp (300ms)
- **Card Appearance**: scaleIn + fadeIn (200ms)
- **Drag Movement**: transform movement (instant response)
- **Loading State**: pulse effect (infinite loop)

### 5.3 User Feedback

#### Success Feedback
- **Color**: Green #10B981
- **Icon**: ✅ Checkmark icon
- **Animation**: Success prompt slides in from bottom
- **Auto Dismiss**: Auto-hide after 3 seconds

#### Error Feedback
- **Color**: Red #EF4444
- **Icon**: ❌ Cross icon
- **Animation**: Shake effect (mobile)
- **Duration**: Until user closes

#### Warning Feedback
- **Color**: Orange #F59E0B
- **Icon**: ⚠️ Warning icon
- **Animation**: Blinking effect
- **Interaction**: Clickable to view details

## 6. Component Design Specification

### 6.1 Button Components

#### Primary Button
```css
/* Default State */
background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
color: white;
border: none;
border-radius: 8px;
padding: 12px 24px;
font-weight: 600;

/* Hover State */
background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
transform: translateY(-1px);
box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

/* Click State */
transform: translateY(0);
box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
```

#### Secondary Button
```css
background: white;
color: #3B82F6;
border: 2px solid #3B82F6;
border-radius: 8px;
padding: 12px 24px;
font-weight: 600;

/* Hover State */
background: #E0F2FE;
transform: translateY(-1px);
```

#### Text Button
```css
background: transparent;
color: #3B82F6;
border: none;
border-radius: 6px;
padding: 8px 16px;
font-weight: 500;

/* Hover State */
background: #E0F2FE;
```

### 6.2 Card Components

#### Task Card
```css
background: white;
border: 1px solid #E5E7EB;
border-radius: 8px;
padding: 16px;
margin-bottom: 12px;
transition: all 0.2s ease;

/* Hover Effect */
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
border-color: #3B82F6;

/* Drag State */
opacity: 0.8;
transform: rotate(2deg) scale(0.95);
```

#### Card Content Structure
```
┌─────────────────────────────────┐
│ [Priority Label] Task Title     │
│                                 │
│ 📝 Task Description Content...  │
│                                 │
│ 👤 Assignee    🏷️ Tag1, Tag2   │
│ 📅 Due Date                     │
└─────────────────────────────────┘
```

### 6.3 Modal Components

#### Basic Modal
```css
/* Background Overlay */
background: rgba(0, 0, 0, 0.5);
backdrop-filter: blur(4px);

/* Modal Body */
background: white;
border-radius: 12px;
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
max-width: 500px;
width: 90%;
max-height: 80vh;
overflow-y: auto;

/* Entry Animation */
animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
```

#### Form Modal
- **Title**: 24px font, bold
- **Input Fields**: Rounded 8px, border #D1D5DB, focus border #3B82F6
- **Button Group**: Right-aligned, primary button priority
- **Validation Feedback**: Error state red border + hint text

### 6.4 Input Components

#### Text Input
```css
border: 2px solid #E5E7EB;
border-radius: 8px;
padding: 12px 16px;
font-size: 16px;
transition: border-color 0.2s ease;

/* Focus State */
border-color: #3B82F6;
box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);

/* Error State */
border-color: #EF4444;
```

#### Search Box
- **Icon**: Search icon on left
- **Placeholder**: "Search tasks, tags, members..."
- **Clear Button**: Show clear icon when content is entered
- **Search Suggestions**: Dropdown showing search history and suggestions

### 6.5 Navigation Components

#### Breadcrumb Navigation
```css
font-size: 14px;
color: #6B7280;
margin-bottom: 16px;

/* Current Page */
color: #1F2937;
font-weight: 600;

/* Separator */
color: #D1D5DB;
margin: 0 8px;
```

#### Tab Navigation
```css
border-bottom: 2px solid #E5E7EB;
margin-bottom: 24px;

/* Tab Item */
padding: 12px 16px;
color: #6B7280;
border-bottom: 2px solid transparent;
transition: all 0.2s ease;

/* Active State */
color: #3B82F6;
border-bottom-color: #3B82F6;
font-weight: 600;
```

## 7. User Experience Process Design

### 7.1 User Registration and Login Process

#### Registration Process
```
Homepage → Click "Register" → Email/Username Input → Email Verification → 
Set Password → Complete Personal Info → Select Team Type → 
Guide to Create First Board → Enter Main Interface
```

**Design Points**:
- **Simplified Registration**: Support quick email registration
- **Instant Verification**: Real-time verification of email format and password strength
- **Visual Guidance**: Newbie guide animation showing core features
- **Skip Mechanism**: Some information can be completed during usage

#### Login Process
```
Login Page → Input Credentials → Remember Me Option → Login → 
Redirect to Last Visited Page
```

**Security Features**:
- **Auto Login**: 7-day login-free
- **Two-factor Authentication**: Optional 2FA support
- **Social Login**: Support Google/GitHub quick login
- **Password Recovery**: Email/phone number password recovery

### 7.2 Create Board Process

#### First Creation
```
Main Interface → "Create Board" Button → Board Info Settings → 
Select Template → Set Column Types → Invite Members → 
Complete Creation → Enter Board
```

**Create Form Fields**:
- **Board Name**: Required, max 50 characters
- **Board Description**: Optional, max 200 characters
- **Privacy Settings**: Public/Private/Team Visible
- **Template Selection**: Empty Board/Agile Development/Content Creation/General
- **Column Settings**: Todo/In Progress/Done and other default columns

#### Quick Creation
- **One-click Creation**: Quick creation based on default template
- **Copy Board**: Copy existing board structure
- **Import Data**: Import tasks from Excel/Trello, etc.

### 7.3 Task Management Process

#### Create Task
```
Board → Click "+ Add Task" → Task Details Edit → 
Save → Task Appears in Corresponding Column
```

**Task Creation Methods**:
- **Quick Creation**: Click "+" at bottom of column
- **Detailed Creation**: Right-click menu → New Task
- **Batch Creation**: Support batch import tasks
- **Template Creation**: Create based on task template

#### Edit Task
```
Click Task Card → Open Task Details → Edit Information → 
Save Changes → Real-time Sync Update
```

**Editable Information**:
- Basic info: Title, Description, Priority
- Personnel assignment: Assignee, Collaborators
- Time management: Start date, Due date
- Classification tags: Task type, Tag classification
- Attachment files: Support image, document upload
- Sub-tasks: Create and manage sub-tasks

#### Task Movement
```
Drag Task Card → Move to Target Column → Release → 
Task Status Update → Trigger Notification
```

**Movement Rules**:
- **Permission Check**: Check if user has permission to move task
- **Status Validation**: Verify if movement is reasonable
- **Dependency Handling**: Prompt related task dependencies
- **Auto Notification**: Notify relevant members of task status changes

### 7.4 Team Collaboration Process

#### Member Invitation
```
Board Settings → Member Management → Invite Members → 
Input Email → Send Invitation → Member Accept Invitation → Join Board
```

**Invitation Methods**:
- **Email Invitation**: Send invitation email
- **Link Sharing**: Generate share link
- **Batch Import**: Batch invite multiple members
- **Role Settings**: Admin/Editor/Viewer permissions

#### Permission Management
- **Board Owner**: Full permissions, can transfer
- **Admin**: Manage board settings and members
- **Editor**: Can edit tasks and create boards
- **Viewer**: Read-only permissions

### 7.5 Search and Filter Process

#### Global Search
```
Any Page → Ctrl+K / Click Search Box → 
Input Keywords → Real-time Display Results → Click to Enter
```

**Search Functions**:
- **Smart Search**: Support task name, description, tag search
- **Search Suggestions**: Display relevant suggestions in real-time
- **Search History**: Save recent search records
- **Advanced Filter**: Filter by status, assignee, date

#### Board Filter
```
Board → Filter Button → Set Filter Conditions → 
Apply Filter → View Filter Results → Clear Filter
```

**Filter Dimensions**:
- **Task Status**: Todo/In Progress/Completed
- **Priority**: Low/Medium/High/Urgent
- **Assignee**: Specific member or unassigned
- **Tags**: Specific tag classifications
- **Time Range**: Creation time/Due date

## 8. Performance Optimization

### 8.1 Loading Optimization
- **Lazy Loading**: Task card lazy loading, reduce initial loading time
- **Virtual Scrolling**: Use virtual scrolling for large number of tasks
- **Image Optimization**: WebP format, responsive images
- **Code Splitting**: Split code packages by route

### 8.2 Interaction Optimization
- **Debounce Processing**: Search input debounce, 300ms delay
- **Throttle Processing**: Drag event throttling, improve performance
- **Preloading**: Preload boards users might access
- **Caching Strategy**: Reasonably cache user data and settings

## 9. Accessibility Design

### 9.1 Visual Accessibility
- **Contrast**: Ensure text and background contrast ratio ≥ 4.5:1
- **Color Assistance**: Don't rely solely on color to convey information
- **Font Size**: Support user font size adjustment
- **Animation Control**: Provide option to reduce animations

### 9.2 Keyboard Navigation
- **Tab Navigation**: Complete keyboard Tab navigation
- **Keyboard Shortcuts**: Support keyboard shortcuts for common operations
- **Focus Management**: Clear focus indicators
- **Context Menu**: Support keyboard-operated context menus

### 9.3 Screen Reader Support
- **Semantic HTML**: Use correct HTML tags
- **ARIA Labels**: Appropriate ARIA labels and attributes
- **Alternative Text**: Provide alt text for images and icons
- **State Description**: Voice description of task status changes

## 10. Design Delivery Specifications

### 10.1 Icon Specifications
- **Style**: Line icons, 2px stroke width
- **Sizes**: 16px, 20px, 24px, 32px
- **Colors**: Inherit parent element color or specified color
- **Naming**: Use semantic naming, e.g., `icon-add-task.svg`

### 10.2 Font Specifications
- **Chinese Fonts**: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei"
- **English Fonts**: "SF Pro Display", "Segoe UI", "Roboto"
- **Font Sizes**: 12px, 14px, 16px, 18px, 24px, 32px
- **Font Weights**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

### 10.3 Spacing Specifications
- **Base Unit**: 8px
- **Common Spacing**: 4px, 8px, 16px, 24px, 32px, 48px, 64px
- **Component Spacing**: 
  - Card spacing: 16px
  - List item spacing: 12px
  - Button spacing: 12px
  - Form field spacing: 16px

### 10.4 Shadow Specifications
```css
/* Card Shadow */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

/* Hover Shadow */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

/* Modal Shadow */
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

/* Button Press Shadow */
box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
```

## 11. Development Implementation Suggestions

### 11.1 Technology Stack Recommendations
- **Frontend Framework**: React 18+ / Vue 3+
- **UI Component Library**: Ant Design / Element Plus
- **State Management**: Redux / Vuex / Zustand
- **Animation Library**: Framer Motion / Vue Transition
- **Styling Solution**: CSS Modules / Styled Components / Tailwind CSS

### 11.2 Development Process
1. **Design Review**: Development review after UI/UX design completion
2. **Component Development**: Develop basic components according to component specifications
3. **Page Integration**: Combine components to form complete pages
4. **Interaction Testing**: Test all interaction processes completely
5. **Performance Optimization**: Performance testing and optimization
6. **Accessibility Testing**: Accessibility testing

### 11.3 Quality Assurance
- **Design Fidelity**: Ensure UI matches design mockups ≥ 95%
- **Cross-browser Compatibility**: Support latest two versions of mainstream browsers
- **Responsive Testing**: Test on various device sizes
- **Performance Metrics**: First screen loading < 3s, interaction response < 100ms
- **User Experience**: Key operation paths are smooth and unobstructed

---

## Appendix

### A. Keyboard Shortcuts List
- `Ctrl+N`: Create new task
- `Ctrl+Shift+N`: Create new board
- `Ctrl+K`: Global search
- `Ctrl+/: Show shortcuts help
- `Delete`: Delete selected task
- `Space`: Quick view task details

### B. Error Status Codes
- `E001`: Network connection error
- `E002`: Insufficient permissions
- `E003`: Data save failed
- `E004`: File upload failed

### C. Design Change Log
- v1.0 (2025-11-29): Initial version, containing complete UI/UX design specifications

---

**Designer**: UI/UX Team  
**Last Updated**: 2025-11-29  
**Version**: v1.0