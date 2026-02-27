import { useState, useMemo, useCallback } from 'react';
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
  Drawer,
  Spin,
  Empty,
  Calendar,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  LineChartOutlined,
  WarningOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { recordsApi, membersApi } from '../../api';
import { useElderModeStore } from '../../store';
import type { HealthRecord, RecordType, QueryRecordParams, MeasurementContext, RecordItem } from '../../types';
import { RecordTypeLabels, RecordTypeUnits, MeasurementContextLabels, RecordTypeGroups } from '../../types';
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
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [recordMode, setRecordMode] = useState<RecordMode>('single');

  // 老人模式：趋势图 Drawer 状态
  const [trendModal, setTrendModal] = useState<{
    memberId: string;
    recordType: RecordType;
    memberName: string;
    typeLabel: string;
  } | null>(null);

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['recordTrend', trendModal?.memberId, trendModal?.recordType, 'quarter'],
    queryFn: () =>
      recordsApi.getTrend({
        memberId: trendModal!.memberId,
        recordType: trendModal!.recordType,
        period: 'quarter',
      }),
    enabled: !!trendModal,
  });

  const trendChartOption = useMemo(() => {
    if (!trendData || trendData.data.length === 0) return {};

    const normalData: (number | null)[] = [];
    const abnormalData: (number | null)[] = [];
    trendData.data.forEach((d) => {
      if (d.isAbnormal) {
        normalData.push(null);
        abnormalData.push(d.value);
      } else {
        normalData.push(d.value);
        abnormalData.push(null);
      }
    });

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const paramsList = params as { axisValue: string; value: number | null; seriesName: string }[];
          const validParam = paramsList.find((p) => p.value !== null);
          if (!validParam) return '';
          const isAbnormal = validParam.seriesName === '异常值';
          return `${validParam.axisValue}<br/>${trendData.label}: ${validParam.value} ${trendData.unit}${isAbnormal ? ' <span style="color:red">(异常)</span>' : ''}`;
        },
      },
      legend: { data: ['正常值', '异常值'], bottom: 0 },
      xAxis: {
        type: 'category',
        data: trendData.data.map((d) => d.date),
        axisLabel: { rotate: 45, fontSize: 11 },
      },
      yAxis: { type: 'value', name: trendData.unit },
      series: [
        {
          name: '正常值',
          type: 'line',
          data: normalData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          connectNulls: true,
          itemStyle: { color: '#136dec' },
          lineStyle: { color: '#136dec', width: 2 },
          markLine: trendData.referenceRange ? {
            silent: true,
            lineStyle: { color: '#13ec5b', type: 'dashed' },
            data: [
              { yAxis: trendData.referenceRange.min, label: { formatter: `下限: ${trendData.referenceRange.min}`, position: 'start' } },
              { yAxis: trendData.referenceRange.max, label: { formatter: `上限: ${trendData.referenceRange.max}`, position: 'start' } },
            ],
          } : undefined,
          markArea: trendData.referenceRange ? {
            silent: true,
            itemStyle: { color: 'rgba(19, 236, 91, 0.1)' },
            data: [[{ yAxis: trendData.referenceRange.min }, { yAxis: trendData.referenceRange.max }]],
          } : undefined,
        },
        {
          name: '异常值',
          type: 'line',
          data: abnormalData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 10,
          connectNulls: false,
          itemStyle: { color: '#ff4d4f' },
          lineStyle: { width: 0 },
        },
      ],
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    };
  }, [trendData]);

  // 老人模式：分类历史记录 Drawer 状态（只存 key/label，记录从 groupedRecords 实时派生）
  const [historyGroup, setHistoryGroup] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);

  // 老人模式：视图切换 + 日历状态
  const [elderView, setElderView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [calendarValue, setCalendarValue] = useState(dayjs());

  // 点击趋势按钮：老人模式打开 Drawer，普通模式导航
  const handleTrendClick = (record: HealthRecord) => {
    if (isElderMode) {
      setTrendModal({
        memberId: record.memberId,
        recordType: record.recordType,
        memberName: record.member?.name || '',
        typeLabel: record.recordTypeLabel,
      });
    } else {
      navigate(`/records/trend?memberId=${record.memberId}&recordType=${record.recordType}`);
    }
  };

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

  // 老人模式：按分类分组记录
  const groupedRecords = useMemo(() => {
    if (!records || records.length === 0) return [];

    const groupColors: Record<string, string> = {
      bloodPressure: '#ff4d4f',
      bloodSugar: '#136dec',
      bloodLipid: '#722ed1',
      basic: '#faad14',
    };

    const groups: {
      key: string;
      label: string;
      color: string;
      latestByType: { type: RecordType; label: string; value: number; unit: string; isAbnormal: boolean }[];
      latestDate: string | null;
      records: HealthRecord[];
      hasAbnormal: boolean;
    }[] = [];

    for (const [groupKey, groupDef] of Object.entries(RecordTypeGroups)) {
      const groupRecords = records.filter((r) => groupDef.types.includes(r.recordType));
      if (groupRecords.length === 0) continue;

      // 获取每种指标的最新记录
      const latestByType = groupDef.types
        .map((type) => {
          const record = groupRecords.find((r) => r.recordType === type);
          if (!record) return null;
          return {
            type: record.recordType,
            label: record.recordTypeLabel,
            value: record.value,
            unit: record.unit,
            isAbnormal: record.isAbnormal,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      groups.push({
        key: groupKey,
        label: groupDef.label,
        color: groupColors[groupKey] || '#136dec',
        latestByType,
        latestDate: groupRecords[0]?.recordDate || null,
        records: groupRecords,
        hasAbnormal: latestByType.some((r) => r.isAbnormal),
      });
    }

    return groups;
  }, [records]);

  // 日历视图：有记录的日期集合
  const recordDatesSet = useMemo(() => {
    if (!records) return new Set<string>();
    const set = new Set<string>();
    records.forEach((r) => set.add(dayjs(r.recordDate).format('YYYY-MM-DD')));
    return set;
  }, [records]);

  // 日历视图：选中日期的记录（按测量次分组）
  const selectedDateSessions = useMemo(() => {
    if (!records) return [];
    const dateStr = selectedDate.format('YYYY-MM-DD');
    const dayRecords = records.filter(
      (r) => dayjs(r.recordDate).format('YYYY-MM-DD') === dateStr,
    );
    if (dayRecords.length === 0) return [];

    // 按测量时间分组
    const sessionMap = new Map<string, HealthRecord[]>();
    dayRecords.forEach((r) => {
      const key = `${r.memberId}_${r.recordDate}`;
      const arr = sessionMap.get(key);
      if (arr) arr.push(r);
      else sessionMap.set(key, [r]);
    });
    return Array.from(sessionMap.values());
  }, [records, selectedDate]);

  // 日历 fullCellRender
  const calendarCellRender = useCallback(
    (date: dayjs.Dayjs, info: { type: string }) => {
      if (info.type !== 'date') return null;
      const dateStr = date.format('YYYY-MM-DD');
      const hasData = recordDatesSet.has(dateStr);
      const isSelected = dateStr === selectedDate.format('YYYY-MM-DD');
      const isToday = dateStr === dayjs().format('YYYY-MM-DD');
      const isCurrentMonth = date.month() === calendarValue.month();

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            opacity: isCurrentMonth ? 1 : 0.3,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: isSelected ? 700 : isToday ? 600 : 400,
              background: isSelected ? '#136dec' : 'transparent',
              color: isSelected ? '#fff' : isToday ? '#136dec' : 'inherit',
            }}
          >
            {date.date()}
          </div>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: hasData ? '#136dec' : 'transparent',
              marginTop: 2,
            }}
          />
        </div>
      );
    },
    [recordDatesSet, selectedDate, calendarValue],
  );

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  const isSingleMember = members?.length === 1;

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await recordsApi.delete(id);
      }
    },
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setDeleteIds([]);
      setDeleteMode(false);
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
    if (deleteIds.length > 0) {
      deleteMutation.mutate(deleteIds);
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
            onClick={() => handleTrendClick(record)}
          >
            趋势
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteIds([record.id])}
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
        /* 老人模式：顶栏区域（sticky 固定） */
        <div style={{
          position: 'sticky',
          top: -8,
          zIndex: 10,
          background: '#fff',
          paddingTop: 8,
          marginTop: -8,
          paddingBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {/* 视图切换器 */}
            <div style={{
              display: 'inline-flex',
              background: '#f0f0f0',
              borderRadius: 20,
              padding: 3,
              flexShrink: 0,
            }}>
              <Button
                type={elderView === 'list' ? 'primary' : 'text'}
                icon={<UnorderedListOutlined />}
                style={{
                  borderRadius: 18,
                  ...(elderView !== 'list' ? { background: 'transparent', border: 'none' } : {}),
                }}
                onClick={() => setElderView('list')}
              >
                列表
              </Button>
              <Button
                type={elderView === 'calendar' ? 'primary' : 'text'}
                icon={<CalendarOutlined />}
                style={{
                  borderRadius: 18,
                  ...(elderView !== 'calendar' ? { background: 'transparent', border: 'none' } : {}),
                }}
                onClick={() => setElderView('calendar')}
              >
                日历
              </Button>
            </div>
            {/* 添加记录按钮 */}
            <Button
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setAddOpen(true)}
              style={{ flex: 1, height: 44, fontSize: 16, borderRadius: 12, background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
            >
              添加记录
            </Button>
          </div>
          {!isSingleMember && availableMembers.length > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
          )}
        </div>
      ) : (
        <>
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
      </>
      )}

      {!isElderMode && (
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

      {isElderMode ? (
        elderView === 'list' ? (
          /* 列表视图：分类卡片 */
          isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          ) : groupedRecords.length === 0 ? (
            <Empty description="暂无健康记录" style={{ padding: 40 }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {groupedRecords.map((group) => (
                <Card
                  key={group.key}
                  style={{
                    borderRadius: 12,
                    borderLeft: `4px solid ${group.color}`,
                    cursor: 'pointer',
                  }}
                  bodyStyle={{ padding: '14px 16px' }}
                  onClick={() => setHistoryGroup({
                    key: group.key,
                    label: group.label,
                  })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 17, fontWeight: 600 }}>
                      {group.label}
                    </span>
                    {group.hasAbnormal && (
                      <Tag color="red" icon={<WarningOutlined />}>异常</Tag>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 8 }}>
                    {group.latestByType.map((item) => (
                      <span key={item.type} style={{ fontSize: 15 }}>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>{item.label}</span>
                        {' '}
                        <span style={{
                          fontWeight: 600,
                          color: item.isAbnormal ? '#ff4d4f' : '#136dec',
                        }}>
                          {item.value}
                        </span>
                        {' '}
                        <span style={{ fontSize: 12, color: 'var(--color-text-quaternary)' }}>{item.unit}</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-quaternary)' }}>
                      {group.latestDate ? dayjs(group.latestDate).format('YYYY-MM-DD HH:mm') : ''}
                    </span>
                    <span style={{ fontSize: 13, color: group.color }}>
                      {group.records.length} 条记录 &gt;
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          /* 日历视图 */
          <div>
            {/* 自定义日历头部 + 日历 */}
            <Card bodyStyle={{ padding: '8px 4px' }} style={{ borderRadius: 12, marginBottom: 12 }}>
              <Calendar
                fullscreen={false}
                value={calendarValue}
                fullCellRender={calendarCellRender}
                headerRender={({ value: hdrValue, onChange: hdrOnChange }) => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
                    <Button
                      type="text"
                      icon={<LeftOutlined />}
                      onClick={() => {
                        const prev = hdrValue.subtract(1, 'month');
                        hdrOnChange(prev);
                        setCalendarValue(prev);
                      }}
                    />
                    <span style={{ fontSize: 17, fontWeight: 600 }}>
                      {hdrValue.format('YYYY年M月')}
                    </span>
                    <Button
                      type="text"
                      icon={<RightOutlined />}
                      onClick={() => {
                        const next = hdrValue.add(1, 'month');
                        hdrOnChange(next);
                        setCalendarValue(next);
                      }}
                    />
                  </div>
                )}
                onSelect={(date, info) => {
                  if (info.source === 'date') {
                    setSelectedDate(date);
                    setCalendarValue(date);
                  }
                }}
              />
            </Card>

            {/* 选中日期的记录 */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                {selectedDate.format('M月D日')} 的记录
              </span>
            </div>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <Spin />
              </div>
            ) : selectedDateSessions.length === 0 ? (
              <Empty description="当天无记录" style={{ padding: 30 }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedDateSessions.map((session) => {
                  const first = session[0];
                  const hasAbnormal = session.some((r) => r.isAbnormal);
                  return (
                    <div
                      key={`${first.memberId}_${first.recordDate}`}
                      style={{
                        border: '2px solid #d9d9d9',
                        borderRadius: 12,
                        padding: '12px 14px',
                        background: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>
                          {dayjs(first.recordDate).format('HH:mm')}
                          {first.member?.name ? ` · ${first.member.name}` : ''}
                        </span>
                        {hasAbnormal && (
                          <Tag color="red" icon={<WarningOutlined />} style={{ marginRight: 0 }}>异常</Tag>
                        )}
                      </div>
                      {session.map((record) => (
                        <div
                          key={record.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '5px 0',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 16, color: 'var(--color-text-tertiary)' }}>
                              {record.recordTypeLabel}
                            </span>
                            {' '}
                            <span style={{
                              fontSize: 20,
                              fontWeight: 600,
                              color: record.isAbnormal ? '#ff4d4f' : '#136dec',
                            }}>
                              {record.value}
                            </span>
                            {' '}
                            <span style={{ fontSize: 14, color: 'var(--color-text-quaternary)' }}>
                              {record.unit}
                            </span>
                          </div>
                          <Button
                            type="text"
                            icon={<LineChartOutlined />}
                            style={{ color: '#136dec', fontSize: 18 }}
                            onClick={() => handleTrendClick(record)}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      ) : (
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
                        onClick={() => handleTrendClick(record)}
                      >
                        趋势
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setDeleteIds([record.id])}
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
      )}

      <Modal
        title="确认删除"
        open={deleteIds.length > 0}
        onOk={handleDelete}
        onCancel={() => setDeleteIds([])}
        confirmLoading={deleteMutation.isPending}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        zIndex={2000}
      >
        <p>确定要删除该记录吗？此操作不可恢复。</p>
      </Modal>

      {/* 老人模式：趋势图 Drawer */}
      {isElderMode && (
        <Drawer
          open={!!trendModal}
          onClose={() => setTrendModal(null)}
          placement="bottom"
          height="85%"
          title={trendModal ? `${trendModal.memberName} · ${trendModal.typeLabel}趋势` : ''}
          destroyOnClose
        >
          {trendLoading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" />
            </div>
          ) : trendData && trendData.data.length > 0 ? (
            <>
              <ReactECharts option={trendChartOption} style={{ height: 280 }} />
              {(() => {
                const values = trendData.data.map((d) => d.value);
                const max = Math.max(...values);
                const min = Math.min(...values);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const abnormalCount = trendData.data.filter((d) => d.isAbnormal).length;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                    <div style={{ background: '#f6ffed', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>最高值</div>
                      <div style={{ fontSize: 20, fontWeight: 600 }}>{max.toFixed(1)} <span style={{ fontSize: 12 }}>{trendData.unit}</span></div>
                    </div>
                    <div style={{ background: '#f0f5ff', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>最低值</div>
                      <div style={{ fontSize: 20, fontWeight: 600 }}>{min.toFixed(1)} <span style={{ fontSize: 12 }}>{trendData.unit}</span></div>
                    </div>
                    <div style={{ background: '#fff7e6', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>平均值</div>
                      <div style={{ fontSize: 20, fontWeight: 600 }}>{avg.toFixed(1)} <span style={{ fontSize: 12 }}>{trendData.unit}</span></div>
                    </div>
                    <div style={{ background: abnormalCount > 0 ? '#fff1f0' : '#f6ffed', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>异常次数</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: abnormalCount > 0 ? '#ff4d4f' : 'inherit' }}>{abnormalCount} 次</div>
                    </div>
                  </div>
                );
              })()}
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--color-text-quaternary)' }}>
                共 {trendData.data.length} 条记录（近 90 天）
              </div>
            </>
          ) : (
            <Empty description="暂无趋势数据" />
          )}
        </Drawer>
      )}

      {/* 老人模式：分类历史记录 Drawer */}
      {isElderMode && (
        <Drawer
          open={!!historyGroup}
          onClose={() => { setHistoryGroup(null); setDeleteMode(false); }}
          placement="bottom"
          height="85%"
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{historyGroup?.label || ''}</span>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                style={{ color: deleteMode ? '#ff4d4f' : 'var(--color-text-tertiary)', fontSize: 18 }}
                onClick={() => setDeleteMode(!deleteMode)}
              />
            </div>
          }
          destroyOnClose
        >
          {/* 点击空白区域退出删除模式 */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div onClick={() => { if (deleteMode) setDeleteMode(false); }}>
          {historyGroup && (() => {
            // 从最新的 groupedRecords 实时获取记录（删除后自动刷新）
            const currentGroup = groupedRecords.find((g) => g.key === historyGroup.key);
            if (!currentGroup || currentGroup.records.length === 0) {
              return <Empty description="暂无记录" />;
            }
            // 按测量时间分组（同一次 createBatch 的记录 recordDate 相同）
            const sessionMap = new Map<string, HealthRecord[]>();
            currentGroup.records.forEach((r) => {
              const key = `${r.memberId}_${r.recordDate}`;
              const arr = sessionMap.get(key);
              if (arr) arr.push(r);
              else sessionMap.set(key, [r]);
            });
            const sessions = Array.from(sessionMap.values());

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessions.map((group) => {
                  const first = group[0];
                  const hasAbnormal = group.some((r) => r.isAbnormal);
                  return (
                    <div
                      key={`${first.memberId}_${first.recordDate}`}
                      style={{
                        position: 'relative',
                        border: '2px solid #d9d9d9',
                        borderRadius: 12,
                        padding: '12px 14px',
                        background: '#fff',
                      }}
                    >
                      {/* 删除模式：红色 X 徽标 */}
                      {deleteMode && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteIds(group.map((r) => r.id));
                          }}
                          style={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#ff4d4f',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            zIndex: 1,
                          }}
                        >
                          ✕
                        </div>
                      )}
                      {/* 日期 + 异常标签 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>
                          {dayjs(first.recordDate).format('YYYY-MM-DD HH:mm')}
                        </span>
                        {hasAbnormal && (
                          <Tag color="red" icon={<WarningOutlined />} style={{ marginRight: 0 }}>异常</Tag>
                        )}
                      </div>
                      {/* 每个指标一行 */}
                      {group.map((record) => (
                        <div
                          key={record.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '5px 0',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 16, color: 'var(--color-text-tertiary)' }}>
                              {record.recordTypeLabel}
                            </span>
                            {' '}
                            <span style={{
                              fontSize: 20,
                              fontWeight: 600,
                              color: record.isAbnormal ? '#ff4d4f' : '#136dec',
                            }}>
                              {record.value}
                            </span>
                            {' '}
                            <span style={{ fontSize: 14, color: 'var(--color-text-quaternary)' }}>
                              {record.unit}
                            </span>
                          </div>
                          <Button
                            type="text"
                            icon={<LineChartOutlined />}
                            style={{ color: '#136dec', fontSize: 18 }}
                            onClick={(e) => { e.stopPropagation(); handleTrendClick(record); }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          </div>
        </Drawer>
      )}

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
