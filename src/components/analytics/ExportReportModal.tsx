import { Modal, Button, Table, App } from 'antd';
import { Download, Copy, FileText } from 'lucide-react';
import { exportToCSV, copyReportToClipboard, type ExportRow } from '../../utils/reportExporter';

interface Props {
  open: boolean;
  onClose: () => void;
  rows: ExportRow[];
  periodLabel: string;
}

export function ExportReportModal({ open, onClose, rows, periodLabel }: Props) {
  const { message } = App.useApp();

  const handleDownload = () => {
    try {
      const filename = `centfolio-report-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.csv`;
      exportToCSV(rows, filename);
      message.success('Report downloaded successfully');
      onClose();
    } catch (e) {
      message.error('Failed to download report');
    }
  };

  const handleCopy = async () => {
    try {
      await copyReportToClipboard(rows);
      message.success('Report copied to clipboard');
      onClose();
    } catch (e) {
      message.error('Failed to copy to clipboard');
    }
  };

  const columns = [
    { 
      title: 'Date', 
      dataIndex: 'date', 
      key: 'date', 
      width: 100,
      render: (val: string) => <span className="font-financial text-xs">{val}</span>
    },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 120 },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
    { 
      title: 'Paid Out', 
      dataIndex: 'paidOut', 
      key: 'paidOut', 
      width: 100, 
      align: 'right' as const,
      render: (val: string) => <span className="font-financial font-semibold">{val}</span>
    },
    { 
      title: 'Net Share', 
      dataIndex: 'netShare', 
      key: 'netShare', 
      width: 100, 
      align: 'right' as const,
      render: (val: string) => <span className="font-financial font-semibold">{val}</span>
    },
  ];

  return (
    <Modal
      title={
          <div className="flex items-center gap-2 text-lg font-bold">
            <FileText className="w-5 h-5 text-primary-500" />
            Export Financial Report
          </div>
        }
        open={open}
        onCancel={onClose}
        width={800}
        footer={null}
        destroyOnClose
        className="rounded-2xl"
      >
        <div className="mt-4 mb-6">
          <p className="text-sm text-text-muted mb-4">
            Preview of your financial report for <strong>{periodLabel}</strong>. Includes all personal expenses and your net share of group expenses.
          </p>
          
          <div className="border border-border-base rounded-xl overflow-hidden mb-6">
            <Table
              dataSource={rows.slice(0, 5).map((r, i) => ({ ...r, key: i }))}
              columns={columns}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
              footer={() => rows.length > 5 ? <div className="text-center text-xs text-text-muted py-1">... and {rows.length - 5} more rows</div> : undefined}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
            <Button 
              className="w-full sm:w-auto h-10 rounded-xl" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              icon={<Copy className="w-4 h-4" />} 
              onClick={handleCopy}
              className="w-full sm:w-auto h-10 rounded-xl border-border-base text-text-main hover:text-primary-500 hover:border-primary-500"
            >
              Copy CSV
            </Button>
            <Button 
              type="primary"
              icon={<Download className="w-4 h-4" />} 
              onClick={handleDownload}
              className="w-full sm:w-auto h-10 rounded-xl font-semibold"
            >
              Download CSV
            </Button>
          </div>
        </div>
      </Modal>
  );
}
