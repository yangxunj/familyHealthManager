import { useState } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Tag,
  Image,
  List,
  Modal,
  message,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../../api';
import type { FileInfo } from '../../types';
import { DocumentTypeLabels, DocumentTypeColors } from '../../types';
import dayjs from 'dayjs';

const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.getById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['memberStats'] });
      navigate('/documents');
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  const handleDelete = () => {
    if (id) {
      deleteMutation.mutate(id);
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (mimeType === 'application/pdf') {
      return <FilePdfOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />;
    }
    if (mimeType?.startsWith('image/')) {
      return <FileImageOutlined style={{ fontSize: 48, color: '#1890ff' }} />;
    }
    return <FileTextOutlined style={{ fontSize: 48, color: '#666' }} />;
  };

  const isImage = (mimeType?: string) => mimeType?.startsWith('image/') ?? false;
  const isPdf = (mimeType?: string) => mimeType === 'application/pdf';

  const handlePreview = (file: FileInfo) => {
    if (isImage(file.mimeType)) {
      setPreviewFile(file);
      setPreviewVisible(true);
    } else if (isPdf(file.mimeType)) {
      window.open(file.url, '_blank');
    }
  };

  const handleDownload = (file: FileInfo) => {
    const link = window.document.createElement('a');
    link.href = file.url;
    link.download = file.originalName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!document) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <p>文档不存在</p>
        <Button onClick={() => navigate('/documents')}>返回列表</Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
          返回列表
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => setDeleteModalOpen(true)}
        >
          删除文档
        </Button>
      </div>

      <Card title="文档信息" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="文档名称">{document.name}</Descriptions.Item>
          <Descriptions.Item label="文档类型">
            <Tag color={DocumentTypeColors[document.type]}>
              {DocumentTypeLabels[document.type]}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="家庭成员">{document.member?.name}</Descriptions.Item>
          <Descriptions.Item label="检查日期">
            {dayjs(document.checkDate).format('YYYY-MM-DD')}
          </Descriptions.Item>
          <Descriptions.Item label="检查机构">
            {document.institution || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="上传时间">
            {dayjs(document.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          {document.notes && (
            <Descriptions.Item label="备注" span={2}>
              {document.notes}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title={`文件列表 (${document.files?.length || 0} 个)`}>
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
          dataSource={document.files || []}
          renderItem={(file: FileInfo) => (
            <List.Item>
              <Card
                hoverable
                cover={
                  isImage(file.mimeType) ? (
                    <div
                      style={{
                        height: 150,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f5f5f5',
                      }}
                    >
                      <img
                        src={file.url}
                        alt={file.originalName}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        height: 150,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f5f5f5',
                      }}
                    >
                      {getFileIcon(file.mimeType)}
                    </div>
                  )
                }
                actions={[
                  <Button
                    key="preview"
                    type="link"
                    size="small"
                    onClick={() => handlePreview(file)}
                  >
                    预览
                  </Button>,
                  <Button
                    key="download"
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload(file)}
                  >
                    下载
                  </Button>,
                ]}
              >
                <Card.Meta
                  title={
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                      title={file.originalName}
                    >
                      {file.originalName}
                    </span>
                  }
                  description={file.size ? `${(file.size / 1024).toFixed(1)} KB` : '-'}
                />
              </Card>
            </List.Item>
          )}
        />
      </Card>

      <Image
        style={{ display: 'none' }}
        preview={{
          visible: previewVisible,
          src: previewFile?.url,
          onVisibleChange: (visible) => {
            setPreviewVisible(visible);
            if (!visible) {
              setPreviewFile(null);
            }
          },
        }}
      />

      <Modal
        title="确认删除"
        open={deleteModalOpen}
        onOk={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        confirmLoading={deleteMutation.isPending}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除该文档吗？删除后相关文件也将被删除，此操作不可恢复。</p>
      </Modal>
    </div>
  );
};

export default DocumentDetail;
