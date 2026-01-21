import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Select,
  DatePicker,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, membersApi } from '../../api';
import type { HealthDocument, DocumentType, QueryDocumentParams } from '../../types';
import { DocumentTypeLabels, DocumentTypeColors } from '../../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const DocumentList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [filters, setFilters] = useState<QueryDocumentParams>({
    memberId: searchParams.get('memberId') || undefined,
  });

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', filters],
    queryFn: () => documentsApi.getAll(filters),
  });

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
          onClick={() => navigate('/documents/upload')}
        >
          上传文档
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Select
              placeholder="选择家庭成员"
              allowClear
              style={{ width: '100%' }}
              value={filters.memberId}
              onChange={(value) => setFilters({ ...filters, memberId: value })}
            >
              {members?.map((member) => (
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
            >
              {(Object.keys(DocumentTypeLabels) as DocumentType[]).map((key) => (
                <Select.Option key={key} value={key}>
                  {DocumentTypeLabels[key]}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(dates) => {
                if (dates) {
                  setFilters({
                    ...filters,
                    startDate: dates[0]?.format('YYYY-MM-DD'),
                    endDate: dates[1]?.format('YYYY-MM-DD'),
                  });
                } else {
                  setFilters({
                    ...filters,
                    startDate: undefined,
                    endDate: undefined,
                  });
                }
              }}
            />
          </Col>
        </Row>
      </Card>

      <Card>
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
    </div>
  );
};

export default DocumentList;
