import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/home";
import Plants from "@/pages/plants";
import PlantDetails from "@/pages/plant-details";
import Tasks from "@/pages/tasks";
import LocationMap from "@/pages/location-map";
import Guides from "@/pages/guides";
import Schedule from "@/pages/schedule";
import TaskTemplateConfig from "@/components/TaskTemplateConfig";
import ChecklistItemsPage from "@/pages/ChecklistItemsPage";
import NotFound from "@/pages/not-found";
import TaskChainsPage from "@/pages/task-chains";
import ChainAssignmentsPage from "@/pages/chain-assignments";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/plants" component={Plants} />
      <Route path="/plants/:id" component={PlantDetails} />
      <Route path="/plants/:id/tasks" component={Tasks} />
      <Route path="/location-map" component={LocationMap} />
      <Route path="/guides" component={Guides} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/task-templates" component={TaskTemplateConfig} />
      <Route path="/templates/:id/checklist" component={ChecklistItemsPage} />
      <Route path="/task-chains" component={TaskChainsPage} />
      <Route path="/chains" component={ChainAssignmentsPage} />
      <Route path="/settings" component={() => <div>Settings Page</div>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background pb-16">
        <Router />
        <BottomNav />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;