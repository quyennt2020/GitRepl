// Mock data for testing task chains functionality
export const mockTaskChains = [
  {
    id: 1,
    name: "Basic Plant Care",
    description: "Regular care routine for indoor plants",
    category: "water",
    createdAt: new Date().toISOString(),
    isActive: true,
  },
  {
    id: 2,
    name: "Advanced Fertilization",
    description: "Comprehensive fertilization schedule",
    category: "fertilize",
    createdAt: new Date().toISOString(),
    isActive: true,
  },
];

export const mockTaskTemplates = [
  {
    id: 1,
    name: "Water Plant",
    category: "water",
    description: "Basic watering task",
    defaultInterval: 7,
    priority: "medium",
    estimatedDuration: 15,
    requiresExpertise: false,
    public: true,
    applyToAll: false,
  },
  {
    id: 2,
    name: "Fertilize Plant",
    category: "fertilize",
    description: "Apply fertilizer",
    defaultInterval: 14,
    priority: "high",
    estimatedDuration: 30,
    requiresExpertise: true,
    public: true,
    applyToAll: false,
  },
  {
    id: 3,
    name: "Health Check",
    category: "check",
    description: "Inspect plant health",
    defaultInterval: 7,
    priority: "low",
    estimatedDuration: 10,
    requiresExpertise: false,
    public: true,
    applyToAll: true,
  },
];
