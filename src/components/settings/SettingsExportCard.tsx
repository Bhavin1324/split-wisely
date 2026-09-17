import { Card, Divider, Button } from 'antd';
import { Download } from 'lucide-react';

interface SettingsExportCardProps {
  onExportCSV: () => void;
  onExportJSON: () => void;
  isExportingCSV: boolean;
  isExportingJSON: boolean;
}

export function SettingsExportCard({
  onExportCSV,
  onExportJSON,
  isExportingCSV,
  isExportingJSON,
}: SettingsExportCardProps) {
  return (
    <Card className="rounded-2xl border-border-base shadow-sm">
      <div className="flex items-center gap-4">
        <Download className="w-5 h-5 text-text-muted flex-shrink-0" />
        <h2 className="text-base font-semibold text-text-base">Export Data</h2>
      </div>
      <Divider className="my-4" />
      <p className="text-sm text-text-muted mb-4">
        Download your expense data for personal records or backup.
      </p>
      <div className="flex gap-3">
        <Button 
          onClick={onExportCSV} 
          loading={isExportingCSV}
          icon={<Download className="w-4 h-4" />}
        >
          Export CSV
        </Button>
        <Button 
          onClick={onExportJSON} 
          loading={isExportingJSON}
          icon={<Download className="w-4 h-4" />}
        >
          JSON Backup
        </Button>
      </div>
    </Card>
  );
}
