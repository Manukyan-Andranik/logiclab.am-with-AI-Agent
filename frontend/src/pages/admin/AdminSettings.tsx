const AdminSettings = () => {
  return (
    <div className="space-y-8 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage administrative settings and preferences.</p>
      </div>

      <div className="glass-card p-8 rounded-2xl border border-border/50 max-w-2xl">
        <h3 className="text-xl font-bold mb-6">Profile Settings</h3>
        <p className="text-muted-foreground mb-8">This section is under construction. Settings will be available soon.</p>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl">
            <div>
              <p className="font-medium">System Notifications</p>
              <p className="text-xs text-muted-foreground">Receive emails about new registrations</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Temporarily disable public access</p>
            </div>
            <div className="w-10 h-6 bg-secondary rounded-full relative">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
