# Task Chains Feature Proposal for Plant Care

## Overview
Task chains allow creating templates for sequences of related plant care tasks that must be performed in a specific order. This enables complex care procedures to be standardized and reused across plants.

## Data Model

### New Schema Fields
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
  templateId: integer("template_id").notNull(),
  order: integer("order").notNull(),
  isRequired: boolean("is_required").default(true),
  waitDuration: integer("wait_duration"), // Hours to wait after previous step
  condition: jsonb("condition"), // Conditions for step to be active
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
```

## Features

### Chain Management
1. Create chain templates with:
   - Name and description
   - Category (same as task templates)
   - Ordered sequence of tasks
   - Wait periods between tasks
   - Required vs optional steps
   - Conditional branching

2. Chain Templates Examples:
   ```typescript
   // Example: Repotting Chain
   {
     name: "Spring Repotting",
     category: "repot",
     steps: [
       {
         order: 1,
         templateId: "prepare_pot",
         isRequired: true,
         waitDuration: 0
       },
       {
         order: 2,
         templateId: "remove_old_soil",
         isRequired: true,
         waitDuration: 0
       },
       {
         order: 3,
         templateId: "trim_roots",
         isRequired: false,
         condition: { type: "ROOTS_CONDITION", value: "overgrown" }
       },
       {
         order: 4,
         templateId: "add_soil",
         isRequired: true,
         waitDuration: 0
       }
     ]
   }
   ```

### Chain Execution
1. Starting a Chain:
   - Assign chain to plant(s)
   - Initialize first task
   - Track progress through steps

2. Progress Tracking:
   - Current step status
   - Completed steps
   - Waiting periods
   - Conditional branches taken

### UI Components

1. Chain Builder Interface:
   ```typescript
   interface ChainBuilderProps {
     existingChain?: TaskChain;
     onSave: (chain: TaskChain) => void;
   }
   ```
   Features:
   - Drag-and-drop step ordering
   - Task template selection
   - Wait duration inputs
   - Condition builder
   - Preview mode

2. Chain Progress View:
   ```typescript
   interface ChainProgressProps {
     chainAssignment: ChainAssignment;
     plant: Plant;
   }
   ```
   Features:
   - Step completion status
   - Next action indicators
   - Time remaining displays
   - Branching visualization

## Benefits

1. Standardization
   - Consistent plant care procedures
   - Quality control
   - Training aid

2. Efficiency
   - Reusable templates
   - Automated progression
   - Clear task dependencies

3. Flexibility
   - Optional steps
   - Conditional branches
   - Customizable timing

## Technical Implementation Plan

### Phase 1: Schema Setup
1. Add new tables
2. Create database migrations
3. Update storage interface

### Phase 2: API Layer
1. Chain CRUD endpoints
2. Chain assignment endpoints
3. Progress tracking endpoints

### Phase 3: UI Components
1. Chain builder interface
2. Progress visualization
3. Mobile responsiveness

### Phase 4: Integration
1. Connect with existing task system
2. Add to plant management workflow
3. Testing and validation

## Risks and Considerations

1. Complexity
   - Complex chains might be confusing
   - Need clear visualization
   - Consider limiting chain length

2. Performance
   - Chain queries might be expensive
   - Consider caching strategies
   - Monitor database performance

3. User Experience
   - Learning curve for chain creation
   - Clear progress indicators needed
   - Mobile-friendly interface essential

Please review and provide feedback before implementation begins.