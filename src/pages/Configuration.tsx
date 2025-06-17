import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Configuration: React.FC = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [saved, setSaved] = useState(false);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('openai_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card max-w-2xl mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center text-primary">Configuration</h2>
      <Tabs defaultValue="source" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="source">Source (FTP)</TabsTrigger>
          <TabsTrigger value="destination">Destination</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="source">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-primary">FTP Host</label>
              <Input type="text" placeholder="ftp.example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-primary">Port</label>
              <Input type="number" placeholder="21" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-primary">Username</label>
              <Input type="text" placeholder="ftpuser" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-primary">Password</label>
              <Input type="password" placeholder="••••••••" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-primary">Path</label>
              <Input type="text" placeholder="/data/incoming" required />
            </div>
            <Button type="submit" className="btn-primary w-full mt-4">Save Source Configuration</Button>
          </form>
        </TabsContent>
        <TabsContent value="destination">
          <div className="text-center text-gray-500 py-8">
            Destination configuration coming soon...
          </div>
        </TabsContent>
        <TabsContent value="ai">
          <form className="space-y-4" onSubmit={handleSaveApiKey}>
            <div>
              <label className="block text-sm font-medium mb-1 text-primary">OpenAI API Key</label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="btn-primary w-full mt-4">Save API Key</Button>
            {saved && <div className="text-green-600 text-sm text-center">API Key saved!</div>}
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuration; 