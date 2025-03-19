# Task Chains Feature Proposal for Plant Care

## Overview
Task chains allow creating sequences of related plant care tasks that must be performed in a specific order. Each step in the chain uses an existing task template, combining their rich features (checklists, descriptions, etc.) with sequential execution logic.

## Data Model

### Task Template Integration
```typescript
// Example: Using existing task templates in a chain
const taskTemplates = [
  {
    id: 1,
    name: "Prepare New Pot",
    category: "repot",
    description: "Get a pot 1-2 inches larger than current pot",
    checklist: [
      "Clean new pot",
      "Add drainage holes if needed",
      "Add base layer of stones"
    ]
  },
  {
    id: 2,
    name: "Remove Plant",
    category: "repot",
    description: "Carefully remove plant from old pot",
    checklist: [
      "Water plant lightly",
      "Loosen soil around edges",
      "Gently pull plant"
    ]
  }
]

// These templates are referenced in chain steps
const repottingChain = {
  id: 1,
  name: "Spring Repotting",
  description: "Complete repotting procedure",
  category: "repot",
  steps: [
    {
      order: 1,
      templateId: 1, // References "Prepare New Pot" template
      isRequired: true,
      waitDuration: 0,
      requiresApproval: false
    },
    {
      order: 2,
      templateId: 2, // References "Remove Plant" template
      isRequired: true,
      waitDuration: 0,
      requiresApproval: true, // Expert needs to verify root condition
      approvalRoles: ["expert", "manager"]
    }
  ]
}
```

### Database Schema
```typescript
// New table for task chains
taskChains = pgTable("task_chains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // matches task template categories
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
})

// New table for chain steps
chainSteps = pgTable("chain_steps", {
  id: serial("id").primaryKey(),
  chainId: integer("chain_id").notNull(),
  templateId: integer("template_id").notNull(), // References existing task templates
  order: integer("order").notNull(),
  isRequired: boolean("is_required").default(true),
  waitDuration: integer("wait_duration"), // Hours to wait after previous step
  condition: jsonb("condition"), // Conditions for step to be active
  requiresApproval: boolean("requires_approval").default(false),
  approvalRoles: text("approval_roles").array(), // Roles that can approve this step
})

// New table for chain assignments
chainAssignments = pgTable("chain_assignments", {
  id: serial("id").primaryKey(),
  chainId: integer("chain_id").notNull(),
  plantId: integer("plant_id").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  currentStepId: integer("current_step_id"),
  status: text("status").notNull(), // active, completed, cancelled
})

// New table for step approvals
stepApprovals = pgTable("step_approvals", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  stepId: integer("step_id").notNull(),
  approvedBy: integer("approved_by").notNull(), // Reference to user table
  approvedAt: timestamp("approved_at").defaultNow(),
  notes: text("notes"),
})
```

## Features

### Chain Management
1. Create chain templates by:
   - Selecting existing task templates
   - Arranging them in sequence
   - Setting dependencies and wait times
   - Adding conditional logic
   - Configuring approval requirements

2. Benefits of Using Task Templates:
   - Reuse existing checklists and procedures
   - Maintain consistency in task descriptions
   - Leverage template categories and priorities
   - Keep all task metadata in one place

### Chain Execution
1. Starting a Chain:
   - Assign chain to plant(s)
   - System creates tasks from templates in sequence
   - Each step inherits template properties (checklists, etc.)

2. Progress Tracking:
   - Track completion of individual template tasks
   - Monitor checklist progress from templates
   - Enforce wait periods between steps
   - Handle conditional branching
   - Manage approval checkpoints

3. Approval Process:
   - Block chain progress at approval steps
   - Notify eligible approvers
   - Record approval decisions
   - Track approval history

### UI Components

1. Chain Builder Interface:
```typescript
interface ChainBuilderProps {
  existingChain?: TaskChain;
  availableTemplates: TaskTemplate[]; // List of existing templates to choose from
  onSave: (chain: TaskChain) => void;
}
```
Features:
- Template selector with search/filter
- Drag-and-drop step ordering
- Wait duration inputs
- Condition builder
- Preview mode
- Approval requirement configuration

2. Chain Progress View:
```typescript
interface ChainProgressProps {
  chainAssignment: ChainAssignment;
  plant: Plant;
  templates: Record<number, TaskTemplate>; // Template lookup by ID
  currentUser: User;
}
```
Features:
- Step completion status
- Template checklist display
- Next action indicators
- Time remaining displays
- Branching visualization
- Approval status indicators
- Approval action buttons for authorized users

3. Approval Management:
```typescript
interface ApprovalDialogProps {
  step: ChainStep;
  template: TaskTemplate;
  onApprove: (notes: string) => void;
  onReject: (reason: string) => void;
}
```
Features:
- Step details review
- Checklist verification
- Notes/comments input
- Approval/rejection actions
- History viewing

## Benefits

1. Standardization
   - Consistent plant care procedures
   - Quality control through templates
   - Training aid for new users
   - Expert oversight via approvals

2. Efficiency
   - Reuse existing task templates
   - Automated progression
   - Clear task dependencies
   - Streamlined approval process

3. Flexibility
   - Optional steps based on conditions
   - Customizable timing
   - Mix and match templates
   - Role-based approvals

## Technical Implementation Plan

### Phase 1: Schema Setup
1. Add chain-related tables
2. Create foreign key relationships to task_templates
3. Update storage interface
4. Add approval-related tables

### Phase 2: API Layer
1. Chain CRUD endpoints
2. Chain assignment endpoints
3. Progress tracking endpoints
4. Approval management endpoints

### Phase 3: UI Components
1. Template selector and chain builder
2. Progress visualization
3. Mobile responsiveness
4. Approval interface

### Phase 4: Integration
1. Connect with existing task system
2. Add to plant management workflow
3. Testing and validation
4. Approval flow testing

## Risks and Considerations

1. Complexity
   - Keep chain creation simple
   - Clear visualization of steps
   - Limit chain length initially
   - Intuitive approval UI

2. Performance
   - Efficient template lookups
   - Cache template data
   - Monitor database joins
   - Optimize approval queries

3. User Experience
   - Simple template selection
   - Clear progress indicators
   - Mobile-friendly interface
   - Easy approval process

Please review and provide feedback before implementation begins.