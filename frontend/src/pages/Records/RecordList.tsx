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
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  LineChartOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsApi } from '../../api';
import type { HealthRecord, RecordType, QueryRecordParams } from '../../types';
import { RecordTypeLabels, MeasurementContextLabels } from '../../types';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;

// 时间范围选项
type TimeRangeKey = '7d' | '30d' | '3m' | '6m' | '1y' | 'all';
const timeRangeOptions: { key: TimeRangeKey; label: string }[] = [
  { key: '7d', label: '最近 7 天' },
  { key: '30d', label: '最近 30 天' },
  { key: '3m', label: '最近 3 个月' },
  { key: '6m', label: '最近 6 个月' },
  { key: '1y', label: '最近 1 年' },
  { key: 'all', label: '全部' },
];

// 根据时间范围 key 计算起止日期
const getDateRange = (key: TimeRangeKey): { startDate?: string; endDate?: string } => {
  const today = dayjs();
  const endDate = today.format('YYYY-MM-DD');
  switch (key) {
    case '7d':
      return { startDate: today.subtract(7, 'day').format('YYYY-MM-DD'), endDate };
    case '30d':
      return { startDate: today.subtract(30, 'day').format('YYYY-MM-DD'), endDate };
    case '3m':
      return { startDate: today.subtract(3, 'month').format('YYYY-MM-DD'), endDate };
    case '6m':
      return { startDate: today.subtract(6, 'month').format('YYYY-MM-DD'), endDate };
    case '1y':
      return { startDate: today.subtract(1, 'year').format('YYYY-MM-DD'), endDate };
    case 'all':
    default:
      return { startDate: undefined, endDate: undefined };
  }
};

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
  const [timeRange, setTimeRange] = useState<TimeRangeKey | undefined>(undefined);

  // 查询所有记录用于提取筛选器选项
  const { data: allRecords } = useQuery({
    queryKey: ['records', 'all'],
    queryFn: () => recordsApi.getAll({}),
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ['records', filters],
    queryFn: () => recordsApi.getAll(filters),
  });

  // 从所有记录中提取可用的家庭成员
  const availableMembers = useMemo(() => {
    if (!allRecords || allRecords.length === 0) return [];
    const membersMap = new Map<string, { id: string; name: string }>();
    allRecords.forEach((record) => {
      if (record.member && !membersMap.has(record.member.id)) {
        membersMap.set(record.member.id, { id: record.member.id, name: record.member.name });
      }
    });
    return Array.from(membersMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }, [allRecords]);

  // 从所有记录中提取可用的指标类型
  const availableTypes = useMemo(() => {
    if (!allRecords || allRecords.length === 0) return [];
    const typesSet = new Set<RecordType>();
    allRecords.forEach((record) => {
      if (record.recordType) {
        typesSet.add(record.recordType);
      }
    });
    return Array.from(typesSet);
  }, [allRecords]);

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
              notFoundContent="暂无记录"
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
              placeholder="选择指标类型"
              allowClear
              style={{ width: '100%' }}
              value={filters.recordType}
              onChange={(value) => setFilters({ ...filters, recordType: value })}
              notFoundContent="暂无记录"
            >
              {availableTypes.map((type) => (
                <Select.Option key={type} value={type}>
                  {RecordTypeLabels[type]}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Select
              placeholder="选择时间范围"
              allowClear
              style={{ width: '100%' }}
              value={timeRange}
              onChange={(value) => {
                setTimeRange(value);
                if (value) {
                  const { startDate, endDate } = getDateRange(value);
                  setFilters({ ...filters, startDate, endDate });
                } else {
                  setFilters({ ...filters, startDate: undefined, endDate: undefined });
                }
              }}
            >
              {timeRangeOptions.map((option) => (
                <Select.Option key={option.key} value={option.key}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
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
              <List.Item style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
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
                        color: record.isAbnormal ? '#ff4d4f' : '#136dec',
                      }}
                    >
                      {record.value} {record.unit}
                    </span>
                    {record.referenceRange && (
                      <span style={{ fontSize: 12, color: 'var(--color-text-quaternary)', marginLeft: 8 }}>
                        参考: {record.referenceRange.min} - {record.referenceRange.max}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                    <Space split={<span style={{ color: 'var(--color-border-secondary)' }}>|</span>} wrap>
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
                      type="primary"
                      size="small"
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
