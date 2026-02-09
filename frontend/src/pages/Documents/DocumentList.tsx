import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Select,
  Row,
  Col,
  Grid,
  List,
  Tooltip,
  Form,
  Input,
  DatePicker,
  Upload,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  MinusCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, storageApi, membersApi } from '../../api';
import type { HealthDocument, DocumentType, QueryDocumentParams, FileInfo } from '../../types';
import { DocumentTypeLabels, DocumentTypeColors } from '../../types';
import dayjs from 'dayjs';

const { Dragger } = Upload;

const { useBreakpoint } = Grid;

// 获取文档处理状态
const getProcessStatus = (doc: HealthDocument) => {
  // 兼容历史数据：有 ocrText 也算 OCR 完成，有 parsedData 也算规整完成
  const ocrDone = doc.ocrStatus === 'completed' || !!doc.ocrText;
  const analyzeDone = doc.analyzeStatus === 'completed' || !!doc.parsedData;

  if (ocrDone && analyzeDone) {
    return {
      icon: <CheckCircleFilled style={{ color: '#52c41a' }} />,
      text: '已完成',
      color: '#52c41a',
    };
  }
  if (ocrDone) {
    return {
      icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
      text: 'OCR 已完成',
      color: '#1890ff',
    };
  }
  return {
    icon: <MinusCircleOutlined style={{ color: '#d9d9d9' }} />,
    text: '待处理',
    color: '#d9d9d9',
  };
};

const DocumentList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const [filters, setFilters] = useState<QueryDocumentParams>({
    memberId: searchParams.get('memberId') || undefined,
  });

  // 查询所有文档（不带筛选），用于提取筛选器选项
  const { data: allDocuments } = useQuery({
    queryKey: ['documents', 'all'],
    queryFn: () => documentsApi.getAll({}),
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', filters],
    queryFn: () => documentsApi.getAll(filters),
  });

  // 从所有文档中提取可用的家庭成员
  const availableMembers = useMemo(() => {
    if (!allDocuments || allDocuments.length === 0) return [];
    const membersMap = new Map<string, { id: string; name: string }>();
    allDocuments.forEach((doc) => {
      if (doc.member && !membersMap.has(doc.member.id)) {
        membersMap.set(doc.member.id, { id: doc.member.id, name: doc.member.name });
      }
    });
    return Array.from(membersMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }, [allDocuments]);

  // 从所有文档中提取可用的文档类型
  const availableTypes = useMemo(() => {
    if (!allDocuments || allDocuments.length === 0) return [];
    const typesSet = new Set<DocumentType>();
    allDocuments.forEach((doc) => {
      if (doc.type) {
        typesSet.add(doc.type);
      }
    });
    return Array.from(typesSet);
  }, [allDocuments]);

  // 从所有文档中提取可用年份
  const availableYears = useMemo(() => {
    if (!allDocuments || allDocuments.length === 0) return [];
    const yearsSet = new Set<number>();
    allDocuments.forEach((doc) => {
      if (doc.checkDate) {
        yearsSet.add(dayjs(doc.checkDate).year());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a); // 降序排列
  }, [allDocuments]);

  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['memberStats'] });
      setDeleteId(null);
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  const createMutation = useMutation({
    mutationFn: documentsApi.create,
    onSuccess: () => {
      message.success('文档上传成功');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['memberStats'] });
      handleUploadClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      message.error(err.response?.data?.error?.message || '上传失败');
    },
  });

  const handleFileUpload = async (file: File): Promise<FileInfo | null> => {
    try {
      return await storageApi.uploadFile(file);
    } catch {
      message.error(`文件 ${file.name} 上传失败`);
      return null;
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: async (file) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        message.error('只支持 JPG、PNG、GIF 和 PDF 格式的文件');
        return Upload.LIST_IGNORE;
      }
      if (file.size > 10 * 1024 * 1024) {
        message.error('文件大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      setUploading(true);
      const result = await handleFileUpload(file);
      setUploading(false);
      if (result) {
        setUploadedFiles((prev) => [...prev, result]);
        setFileList((prev) => [
          ...prev,
          { uid: result.name, name: result.originalName, status: 'done', url: result.url },
        ]);
      }
      return false;
    },
    onRemove: (file) => {
      setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
      setUploadedFiles((prev) => prev.filter((f) => f.name !== file.uid));
    },
  };

  const handleUploadSubmit = (values: Record<string, unknown>) => {
    if (uploadedFiles.length === 0) {
      message.error('请至少上传一个文件');
      return;
    }
    createMutation.mutate({
      memberId: values.memberId as string,
      type: values.type as DocumentType,
      name: values.name as string,
      checkDate: (values.checkDate as dayjs.Dayjs).format('YYYY-MM-DD'),
      institution: values.institution as string | undefined,
      files: uploadedFiles,
      notes: values.notes as string | undefined,
    });
  };

  const handleUploadClose = () => {
    setUploadOpen(false);
    uploadForm.resetFields();
    setFileList([]);
    setUploadedFiles([]);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const columns = [
    {
      title: '文档名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: HealthDocument) => (
        <Space>
          <FileTextOutlined />
          <span>{name}</span>
          <Tag color={DocumentTypeColors[record.type]}>
            {DocumentTypeLabels[record.type]}
          </Tag>
        </Space>
      ),
    },
    {
      title: '家庭成员',
      dataIndex: ['member', 'name'],
      key: 'member',
    },
    {
      title: '检查日期',
      dataIndex: 'checkDate',
      key: 'checkDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: HealthDocument, b: HealthDocument) =>
        dayjs(a.checkDate).unix() - dayjs(b.checkDate).unix(),
    },
    {
      title: '检查机构',
      dataIndex: 'institution',
      key: 'institution',
      render: (text: string) => text || '-',
    },
    {
      title: '文件数',
      dataIndex: 'files',
      key: 'files',
      render: (files: unknown[]) => `${files?.length || 0} 个`,
    },
    {
      title: '处理状态',
      key: 'processStatus',
      render: (_: unknown, record: HealthDocument) => {
        const status = getProcessStatus(record);
        return (
          <Tooltip title={status.text}>
            <Space>
              {status.icon}
              <span style={{ color: status.color }}>{status.text}</span>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: HealthDocument) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/documents/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteId(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>健康文档</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setUploadOpen(true)}
        >
          上传文档
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]}>
          <Col xs={24} sm={8}>
            <Select
              placeholder="选择家庭成员"
              allowClear
              style={{ width: '100%' }}
              value={filters.memberId}
              onChange={(value) => setFilters({ ...filters, memberId: value })}
              notFoundContent="暂无文档"
            >
              {availableMembers.map((member) => (
                <Select.Option key={member.id} value={member.id}>
                  {member.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Select
              placeholder="选择文档类型"
              allowClear
              style={{ width: '100%' }}
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value })}
              notFoundContent="暂无文档"
            >
              {availableTypes.map((type) => (
                <Select.Option key={type} value={type}>
                  {DocumentTypeLabels[type]}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Select
              placeholder="选择年份"
              allowClear
              style={{ width: '100%' }}
              value={filters.startDate ? dayjs(filters.startDate).year() : undefined}
              onChange={(year) => {
                if (year) {
                  setFilters({
                    ...filters,
                    startDate: `${year}-01-01`,
                    endDate: `${year}-12-31`,
                  });
                } else {
                  setFilters({
                    ...filters,
                    startDate: undefined,
                    endDate: undefined,
                  });
                }
              }}
              notFoundContent="暂无文档"
            >
              {availableYears.map((year) => (
                <Select.Option key={year} value={year}>
                  {year} 年
                </Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Card bodyStyle={isMobile ? { padding: 0 } : undefined}>
        {isMobile ? (
          <List
            dataSource={documents}
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条`,
            }}
            renderItem={(doc: HealthDocument) => (
              <List.Item style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ marginBottom: 8 }}>
                    <Space wrap>
                      <FileTextOutlined />
                      <span style={{ fontWeight: 500 }}>{doc.name}</span>
                      <Tag color={DocumentTypeColors[doc.type]}>
                        {DocumentTypeLabels[doc.type]}
                      </Tag>
                    </Space>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                    <Space split={<span style={{ color: 'var(--color-border-secondary)' }}>|</span>}>
                      <span>{doc.member?.name}</span>
                      <span>{dayjs(doc.checkDate).format('YYYY-MM-DD')}</span>
                    </Space>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                    <Space split={<span style={{ color: 'var(--color-border-secondary)' }}>|</span>}>
                      <span>{doc.institution || '-'}</span>
                      <span>{doc.files?.length || 0} 个文件</span>
                      <span style={{ color: getProcessStatus(doc).color }}>
                        {getProcessStatus(doc).icon} {getProcessStatus(doc).text}
                      </span>
                    </Space>
                  </div>
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      查看
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setDeleteId(doc.id)}
                    >
                      删除
                    </Button>
                  </Space>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={documents}
            rowKey="id"
            loading={isLoading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        )}
      </Card>

      <Modal
        title="确认删除"
        open={!!deleteId}
        onOk={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmLoading={deleteMutation.isPending}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除该文档吗？删除后相关文件也将被删除。</p>
      </Modal>

      <Modal
        title="上传健康文档"
        open={uploadOpen}
        onCancel={handleUploadClose}
        footer={null}
        width={isMobile ? '100%' : 600}
        style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw', paddingBottom: 0 } : undefined}
        styles={isMobile ? { body: { maxHeight: 'calc(100dvh - 55px)', overflowY: 'auto' } } : undefined}
        destroyOnClose
      >
        <Form form={uploadForm} layout="vertical" onFinish={handleUploadSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="memberId"
            label="家庭成员"
            rules={[{ required: true, message: '请选择家庭成员' }]}
          >
            <Select placeholder="请选择家庭成员">
              {members?.map((member) => (
                <Select.Option key={member.id} value={member.id}>
                  {member.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="type"
            label="文档类型"
            rules={[{ required: true, message: '请选择文档类型' }]}
          >
            <Select placeholder="请选择文档类型">
              {(Object.keys(DocumentTypeLabels) as DocumentType[]).map((key) => (
                <Select.Option key={key} value={key}>
                  {DocumentTypeLabels[key]}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="文档名称"
            rules={[{ required: true, message: '请输入文档名称' }]}
          >
            <Input placeholder="例如：2024年度体检报告" />
          </Form.Item>

          <Form.Item
            name="checkDate"
            label="检查日期"
            rules={[{ required: true, message: '请选择检查日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              inputReadOnly={isMobile}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item name="institution" label="检查机构">
            <Input placeholder="例如：XX医院体检中心" />
          </Form.Item>

          <Form.Item
            label="上传文件"
            required
            extra="支持 JPG、PNG、GIF、PDF 格式，单个文件不超过 10MB"
          >
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">支持单个或批量上传</p>
            </Dragger>
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleUploadClose}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || uploading}
                disabled={uploadedFiles.length === 0}
              >
                提交
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentList;
