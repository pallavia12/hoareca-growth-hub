const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="text-muted-foreground">This page is under construction. Coming soon!</p>
  </div>
);

export const ProspectsPage = () => <PlaceholderPage title="Step 1: Prospect Building" />;
export const LeadsPage = () => <PlaceholderPage title="Step 2: Lead Generation" />;
export const SampleOrdersPage = () => <PlaceholderPage title="Step 3: Visit to Sample Order" />;
export const AgreementsPage = () => <PlaceholderPage title="Step 4: Sample Order to Agreement" />;
export const AnalyticsPage = () => <PlaceholderPage title="Analytics Dashboard" />;
export const ConfigPage = () => <PlaceholderPage title="Backend Configuration" />;
export const ProfilePage = () => <PlaceholderPage title="My Profile" />;
