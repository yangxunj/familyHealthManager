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
  Grid,
  List,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  LineChartOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsApi, membersApi } from '../../api';
import type { HealthRecord, RecordType, QueryRecordParams } from '../../types';
import { RecordTypeLabels, MeasurementContextLabels } from '../../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const RecordList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [filters, setFilters] = useState<QueryRecordParams>({
    memberId: searchParams.get('memberId') || undefined,
  });

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ['records', filters],
    queryFn: () => recordsApi.getAll(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: recordsApi.delete,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['records'] });
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
      title: '指标',
      dataIndex: 'recordTypeLabel',
      key: 'recordTypeLabel',
      render: (label: string, record: HealthRecord) => (
        <Space>
          <span>{label}</span>
          {record.isAbnormal && (
            <Tag color="red" icon={<WarningOutlined />}>
              异常
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '数值',
      key: 'value',
      render: (_: unknown, record: HealthRecord) => (
        <span style={{ color: record.isAbnormal ? '#ff4d4f' : 'inherit', fontWeight: record.isAbnormal ? 'bold' : 'normal' }}>
          {record.value} {record.unit}
        </span>
      ),
    },
    {
      title: '家庭成员',
      dataIndex: ['member', 'name'],
      key: 'member',
    },
    {
      title: '记录日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: HealthRecord, b: HealthRecord) =>
        dayjs(a.recordDate).unix() - dayjs(b.recordDate).unix(),
    },
    {
      title: '测量场景',
      dataIndex: 'context',
      key: 'context',
      render: (context: string) =>
        MeasurementContextLabels[context as keyof typeof MeasurementContextLabels] || context,
    },
    {
      title: '参考范围',
      key: 'referenceRange',
      render: (_: unknown, record: HealthRecord) =>
        record.referenceRange
          ? `${record.referenceRange.min} - ${record.referenceRange.max}`
          : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: HealthRecord) => (
        <Space>
          <Button
            type="link"
            icon={<LineChartOutlined />}
            onClick={() =>
              navigate(
                `/records/trend?memberId=${record.memberId}&recordType=${record.recordType}`,
              )
            }
          >
            趋势
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
        <h2 style={{ margin: 0 }}>健康记录</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/records/add')}
        >
          添加记录
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
              placeholder="选择指标类型"
              allowClear
              style={{ width: '100%' }}
              value={filters.recordType}
              onChange={(value) => setFilters({ ...filters, recordType: value })}
            >
              {(Object.keys(RecordTypeLabels) as RecordType[]).map((key) => (
                <Select.Option key={key} value={key}>
                  {RecordTypeLabels[key]}
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

      <Card bodyStyle={isMobile ? { padding: 0 } : undefined}>
        {isMobile ? (
          <List
            dataSource={records}
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条`,
            }}
            renderItem={(record: HealthRecord) => (
              <List.Item style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ marginBottom: 6 }}>
                    <Space wrap>
                      <span style={{ fontWeight: 500 }}>{record.recordTypeLabel}</span>
                      {record.isAbnormal && (
                        <Tag color="red" icon={<WarningOutlined />}>
                          异常
                        </Tag>
                      )}
                    </Space>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: record.isAbnormal ? '#ff4d4f' : '#1890ff',
                      }}
                    >
                      {record.value} {record.unit}
                    </span>
                    {record.referenceRange && (
                      <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
                        参考: {record.referenceRange.min} - {record.referenceRange.max}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                    <Space split={<span style={{ color: '#d9d9d9' }}>|</span>} wrap>
                      <span>{record.member?.name}</span>
                      <span>{dayjs(record.recordDate).format('YYYY-MM-DD HH:mm')}</span>
                      <span>
                        {MeasurementContextLabels[
                          record.context as keyof typeof MeasurementContextLabels
                        ] || record.context}
                      </span>
                    </Space>
                  </div>
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      icon={<LineChartOutlined />}
                      onClick={() =>
                        navigate(
                          `/records/trend?memberId=${record.memberId}&recordType=${record.recordType}`,
                        )
                      }
                      style={{ paddingLeft: 0 }}
                    >
                      趋势
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setDeleteId(record.id)}
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
            dataSource={records}
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
        <p>确定要删除该记录吗？此操作不可恢复。</p>
      </Modal>
    </div>
  );
};

export default RecordList;
