import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50/50">
      <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: 'var(--color-primary-500)' }} spin />} />
    </div>
  );
}
