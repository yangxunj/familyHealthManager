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
  Form,
  InputNumber,
  DatePicker,
  Divider,
  Radio,
  Tabs,
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
import { useElderModeStore } from '../../store';
import type { HealthRecord, RecordType, QueryRecordParams, MeasurementContext, RecordItem } from '../../types';
import { RecordTypeLabels, RecordTypeUnits, MeasurementContextLabels } from '../../types';
import dayjs from 'dayjs';
import ElderRecordWizard from './ElderRecordWizard';

type RecordMode = 'single' | 'bloodPressure' | 'bloodSugar' | 'bloodLipid';

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
  const isElderMode = useElderModeStore((s) => s.isElderMode);
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [recordMode, setRecordMode] = useState<RecordMode>('single');

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

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  const isSingleMember = members?.length === 1;

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

  const createMutation = useMutation({
    mutationFn: recordsApi.create,
    onSuccess: () => {
      message.success('记录添加成功');
      queryClient.invalidateQueries({ queryKey: ['records'] });
      handleAddClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      message.error(err.response?.data?.error?.message || '添加失败');
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: recordsApi.createBatch,
    onSuccess: () => {
      message.success('记录添加成功');
      queryClient.invalidateQueries({ queryKey: ['records'] });
      handleAddClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      message.error(err.response?.data?.error?.message || '添加失败');
    },
  });

  const handleAddClose = () => {
    setAddOpen(false);
    addForm.resetFields();
    setRecordMode('single');
  };

  const onAddFinish = (values: Record<string, unknown>) => {
    const recordDate = (values.recordDate as dayjs.Dayjs).toISOString();
    const memberId = values.memberId as string;
    const context = values.context as MeasurementContext | undefined;

    if (recordMode === 'single') {
      createMutation.mutate({
        memberId,
        recordDate,
        recordType: values.recordType as RecordType,
        value: values.value as number,
        unit: RecordTypeUnits[values.recordType as RecordType],
        context,
      });
    } else if (recordMode === 'bloodPressure') {
      const records: RecordItem[] = [];
      if (values.systolicBp) records.push({ recordType: 'SYSTOLIC_BP', value: values.systolicBp as number, unit: 'mmHg' });
      if (values.diastolicBp) records.push({ recordType: 'DIASTOLIC_BP', value: values.diastolicBp as number, unit: 'mmHg' });
      if (values.heartRate) records.push({ recordType: 'HEART_RATE', value: values.heartRate as number, unit: '次/分' });
      if (records.length > 0) {
        createBatchMutation.mutate({ memberId, recordDate, context, records });
      } else {
        message.error('请至少填写一项血压数据');
      }
    } else if (recordMode === 'bloodSugar') {
      createMutation.mutate({
        memberId,
        recordDate,
        recordType: values.glucoseType as RecordType,
        value: values.glucoseValue as number,
        unit: RecordTypeUnits[values.glucoseType as RecordType],
        context,
      });
    } else if (recordMode === 'bloodLipid') {
      const records: RecordItem[] = [];
      if (values.totalCholesterol) records.push({ recordType: 'TOTAL_CHOLESTEROL', value: values.totalCholesterol as number, unit: 'mmol/L' });
      if (values.triglycerides) records.push({ recordType: 'TRIGLYCERIDES', value: values.triglycerides as number, unit: 'mmol/L' });
      if (values.hdl) records.push({ recordType: 'HDL', value: values.hdl as number, unit: 'mmol/L' });
      if (values.ldl) records.push({ recordType: 'LDL', value: values.ldl as number, unit: 'mmol/L' });
      if (records.length > 0) {
        createBatchMutation.mutate({ memberId, recordDate, context, records });
      } else {
        message.error('请至少填写一项血脂数据');
      }
    }
  };

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
      {isElderMode ? (
        <div style={{ marginBottom: 16 }}>
          <Tabs
            activeKey="list"
            onChange={(key) => { if (key === 'trend') navigate('/records/trend'); }}
            items={[
              { key: 'list', label: '记录列表' },
              { key: 'trend', label: '趋势图表' },
            ]}
            tabBarExtraContent={
              <Button
                icon={<PlusOutlined />}
                onClick={() => setAddOpen(true)}
                style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
              >
                添加记录
              </Button>
            }
          />
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>健康记录</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddOpen(true)}
          >
            添加记录
          </Button>
        </div>
      )}

      {isElderMode ? (
        !isSingleMember && availableMembers.length > 0 ? (
          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Button
              type={!filters.memberId ? 'primary' : 'default'}
              style={{ borderRadius: 20, ...(filters.memberId ? { borderColor: 'var(--color-border)' } : {}) }}
              onClick={() => setFilters({ ...filters, memberId: undefined })}
            >
              全部成员
            </Button>
            {availableMembers.map((member) => (
              <Button
                key={member.id}
                type={filters.memberId === member.id ? 'primary' : 'default'}
                style={{ borderRadius: 20, ...(filters.memberId !== member.id ? { borderColor: 'var(--color-border)' } : {}) }}
                onClick={() => setFilters({ ...filters, memberId: member.id })}
              >
                {member.name}
              </Button>
            ))}
          </div>
        ) : null
      ) : (
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
      )}

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

      {/* 老人模式：引导式 Wizard；普通模式：原 Modal */}
      {isElderMode ? (
        <ElderRecordWizard open={addOpen} onClose={handleAddClose} />
      ) : (
        <Modal
          title="添加健康记录"
          open={addOpen}
          onCancel={handleAddClose}
          footer={null}
          destroyOnClose
          width={isMobile ? '100%' : 600}
          style={isMobile ? { top: 0, paddingBottom: 0 } : undefined}
          styles={isMobile ? { body: { maxHeight: 'calc(100dvh - 55px)', overflowY: 'auto' } } : undefined}
        >
          <Form
            form={addForm}
            layout="vertical"
            onFinish={onAddFinish}
            initialValues={{ recordDate: dayjs(), context: 'OTHER' }}
            preserve={false}
          >
            <Form.Item label="记录类型">
              <Radio.Group
                value={recordMode}
                onChange={(e) => {
                  setRecordMode(e.target.value);
                  addForm.resetFields([
                    'recordType', 'value',
                    'systolicBp', 'diastolicBp', 'heartRate',
                    'glucoseType', 'glucoseValue',
                    'totalCholesterol', 'triglycerides', 'hdl', 'ldl',
                  ]);
                }}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="single">单项指标</Radio.Button>
                <Radio.Button value="bloodPressure">血压监测</Radio.Button>
                <Radio.Button value="bloodSugar">血糖监测</Radio.Button>
                <Radio.Button value="bloodLipid">血脂监测</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Divider />

            <Form.Item name="memberId" label="家庭成员" rules={[{ required: true, message: '请选择家庭成员' }]}>
              <Select placeholder="请选择家庭成员">
                {members?.map((member) => (
                  <Select.Option key={member.id} value={member.id}>{member.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="recordDate" label="记录时间" rules={[{ required: true, message: '请选择记录时间' }]}>
              <DatePicker
                showTime
                style={{ width: '100%' }}
                inputReadOnly={isMobile}
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
            </Form.Item>

            <Form.Item name="context" label="测量场景">
              <Select>
                {(Object.keys(MeasurementContextLabels) as (keyof typeof MeasurementContextLabels)[]).map((key) => (
                  <Select.Option key={key} value={key}>{MeasurementContextLabels[key]}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Divider />

            {recordMode === 'single' && (
              <>
                <Form.Item name="recordType" label="指标类型" rules={[{ required: true, message: '请选择指标类型' }]}>
                  <Select placeholder="请选择指标类型">
                    {(Object.keys(RecordTypeLabels) as RecordType[]).map((key) => (
                      <Select.Option key={key} value={key}>{RecordTypeLabels[key]} ({RecordTypeUnits[key]})</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="value" label="数值" rules={[{ required: true, message: '请输入数值' }]}>
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
              </>
            )}

            {recordMode === 'bloodPressure' && (
              <>
                <Form.Item label="收缩压 (mmHg)" name="systolicBp">
                  <InputNumber style={{ width: '100%' }} min={0} max={300} placeholder="90-139 正常" />
                </Form.Item>
                <Form.Item label="舒张压 (mmHg)" name="diastolicBp">
                  <InputNumber style={{ width: '100%' }} min={0} max={200} placeholder="60-89 正常" />
                </Form.Item>
                <Form.Item label="心率 (次/分)" name="heartRate">
                  <InputNumber style={{ width: '100%' }} min={0} max={300} placeholder="60-100 正常" />
                </Form.Item>
              </>
            )}

            {recordMode === 'bloodSugar' && (
              <>
                <Form.Item name="glucoseType" label="血糖类型" rules={[{ required: true, message: '请选择血糖类型' }]}>
                  <Select placeholder="请选择血糖类型">
                    <Select.Option value="FASTING_GLUCOSE">空腹血糖 (3.9-6.1 正常)</Select.Option>
                    <Select.Option value="POSTPRANDIAL_GLUCOSE">餐后血糖 (3.9-7.8 正常)</Select.Option>
                    <Select.Option value="HBA1C">糖化血红蛋白 (4.0-6.0% 正常)</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item name="glucoseValue" label="数值" rules={[{ required: true, message: '请输入数值' }]}>
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
              </>
            )}

            {recordMode === 'bloodLipid' && (
              <>
                <Form.Item label="总胆固醇 (mmol/L)" name="totalCholesterol">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="2.8-5.2 正常" />
                </Form.Item>
                <Form.Item label="甘油三酯 (mmol/L)" name="triglycerides">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.56-1.7 正常" />
                </Form.Item>
                <Form.Item label="HDL (mmol/L)" name="hdl">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="1.0-1.5 正常" />
                </Form.Item>
                <Form.Item label="LDL (mmol/L)" name="ldl">
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0-3.4 正常" />
                </Form.Item>
              </>
            )}

            <Divider />

            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending || createBatchMutation.isPending}
                >
                  提交
                </Button>
                <Button onClick={handleAddClose}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default RecordList;
