import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Select, Button, Space, Spin, Empty, Radio, Tag, Tabs } from 'antd';
import { ArrowLeftOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as echarts from 'echarts';
import { recordsApi, membersApi } from '../../api';
import { useElderModeStore } from '../../store';
import type { RecordType } from '../../types';
import { RecordTypeLabels, RecordTypeGroups } from '../../types';

type PeriodType = 'week' | 'month' | 'quarter' | 'all';

const RecordTrend: React.FC = () => {
  const navigate = useNavigate();
  const isElderMode = useElderModeStore((s) => s.isElderMode);
  const [searchParams] = useSearchParams();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const [memberId, setMemberId] = useState<string | undefined>(
    searchParams.get('memberId') || undefined,
  );
  const [recordType, setRecordType] = useState<RecordType | undefined>(
    (searchParams.get('recordType') as RecordType) || undefined,
  );
  const [period, setPeriod] = useState<PeriodType>('month');

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  // 老人模式：查询所选成员有数据的指标类型
  const { data: memberRecords } = useQuery({
    queryKey: ['records', 'byMember', memberId],
    queryFn: () => recordsApi.getAll({ memberId }),
    enabled: isElderMode && !!memberId,
  });

  const availableTypes = useMemo(() => {
    if (!memberRecords) return [];
    const typesSet = new Set<RecordType>();
    memberRecords.forEach((r) => typesSet.add(r.recordType));
    return Array.from(typesSet);
  }, [memberRecords]);

  // 切换成员后，清除不再可用的指标选择
  useEffect(() => {
    if (isElderMode && recordType && availableTypes.length > 0 && !availableTypes.includes(recordType)) {
      setRecordType(undefined);
    }
  }, [isElderMode, availableTypes, recordType]);

  const { data: trendData, isLoading } = useQuery({
    queryKey: ['recordTrend', memberId, recordType, period],
    queryFn: () =>
      recordsApi.getTrend({
        memberId: memberId!,
        recordType: recordType!,
        period,
      }),
    enabled: !!memberId && !!recordType,
  });

  // 初始化图表
  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // 更新图表数据
  useEffect(() => {
    if (!chartInstance.current || !trendData) return;

    // 准备数据，将异常点和正常点分开处理
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

    const option: echarts.EChartsOption = {
      title: {
        text: `${trendData.label}趋势`,
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const paramsList = params as { axisValue: string; value: number | null; seriesName: string }[];
          const validParam = paramsList.find((p) => p.value !== null);
          if (!validParam) return '';
          const isAbnormal = validParam.seriesName === '异常值';
          return `${validParam.axisValue}<br/>${trendData.label}: ${validParam.value} ${trendData.unit}${
            isAbnormal ? ' <span style="color:red">(异常)</span>' : ''
          }`;
        },
      },
      legend: {
        data: ['正常值', '异常值'],
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: trendData.data.map((d) => d.date),
        axisLabel: {
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: trendData.unit,
        axisLabel: {
          formatter: '{value}',
        },
      },
      series: [
        {
          name: '正常值',
          type: 'line',
          data: normalData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          connectNulls: true,
          itemStyle: {
            color: '#136dec',
          },
          lineStyle: {
            color: '#136dec',
            width: 2,
          },
          markLine: trendData.referenceRange
            ? {
                silent: true,
                lineStyle: {
                  color: '#13ec5b',
                  type: 'dashed',
                },
                data: [
                  {
                    yAxis: trendData.referenceRange.min,
                    label: {
                      formatter: `下限: ${trendData.referenceRange.min}`,
                      position: 'start',
                    },
                  },
                  {
                    yAxis: trendData.referenceRange.max,
                    label: {
                      formatter: `上限: ${trendData.referenceRange.max}`,
                      position: 'start',
                    },
                  },
                ],
              }
            : undefined,
          markArea: trendData.referenceRange
            ? {
                silent: true,
                itemStyle: {
                  color: 'rgba(19, 236, 91, 0.1)',
                },
                data: [
                  [
                    { yAxis: trendData.referenceRange.min },
                    { yAxis: trendData.referenceRange.max },
                  ],
                ],
              }
            : undefined,
        },
        {
          name: '异常值',
          type: 'line',
          data: abnormalData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 10,
          connectNulls: false,
          itemStyle: {
            color: '#ff4d4f',
          },
          lineStyle: {
            width: 0,
          },
        },
      ],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
    };

    chartInstance.current.setOption(option, true);
  }, [trendData]);

  // 响应窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderStatistics = () => {
    if (!trendData || trendData.data.length === 0) return null;

    const values = trendData.data.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const abnormalCount = trendData.data.filter((d) => d.isAbnormal).length;

    return (
      <Card style={{ marginTop: 16 }}>
        <Space size="large" wrap>
          <div>
            <span style={{ color: 'var(--color-text-quaternary)' }}>最高值：</span>
            <span style={{ fontWeight: 'bold' }}>
              {max.toFixed(2)} {trendData.unit}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-quaternary)' }}>最低值：</span>
            <span style={{ fontWeight: 'bold' }}>
              {min.toFixed(2)} {trendData.unit}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-quaternary)' }}>平均值：</span>
            <span style={{ fontWeight: 'bold' }}>
              {avg.toFixed(2)} {trendData.unit}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-quaternary)' }}>异常次数：</span>
            <span style={{ fontWeight: 'bold', color: abnormalCount > 0 ? '#ff4d4f' : 'inherit' }}>
              {abnormalCount} 次
            </span>
            {abnormalCount > 0 && (
              <Tag color="red" icon={<WarningOutlined />} style={{ marginLeft: 8 }}>
                需关注
              </Tag>
            )}
          </div>
          <div>
            <span style={{ color: 'var(--color-text-quaternary)' }}>记录数量：</span>
            <span style={{ fontWeight: 'bold' }}>{trendData.data.length} 条</span>
          </div>
        </Space>
      </Card>
    );
  };

  return (
    <div>
      {isElderMode ? (
        <div style={{ marginBottom: 16 }}>
          <Tabs
            activeKey="trend"
            onChange={(key) => { if (key === 'list') navigate('/records'); }}
            items={[
              { key: 'list', label: '记录列表' },
              { key: 'trend', label: '趋势图表' },
            ]}
          />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/records')}>
              返回列表
            </Button>
          </div>
          <h2 style={{ marginBottom: 24 }}>健康趋势</h2>
        </>
      )}

      {isElderMode ? (
        <div style={{ marginBottom: 16 }}>
          {/* 成员选择 */}
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>选择成员</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
            {members?.map((member) => (
              <Button
                key={member.id}
                type={memberId === member.id ? 'primary' : 'default'}
                style={{ borderRadius: 20, ...(memberId !== member.id ? { borderColor: 'var(--color-border)' } : {}) }}
                onClick={() => setMemberId(member.id)}
              >
                {member.name}
              </Button>
            ))}
          </div>
          {/* 指标选择（只显示有数据的） */}
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 12, marginBottom: 6 }}>选择指标</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
            {!memberId ? (
              <span style={{ fontSize: 14, color: 'var(--color-text-quaternary)', padding: '4px 0' }}>请先选择成员</span>
            ) : availableTypes.length === 0 ? (
              <span style={{ fontSize: 14, color: 'var(--color-text-quaternary)', padding: '4px 0' }}>该成员暂无记录</span>
            ) : (
              availableTypes.map((type) => {
                const isActive = recordType === type;
                return (
                  <Button
                    key={type}
                    style={{
                      borderRadius: 20,
                      ...(isActive
                        ? { background: '#52c41a', borderColor: '#52c41a', color: '#fff' }
                        : { borderColor: 'var(--color-border)' }),
                    }}
                    onClick={() => setRecordType(type)}
                  >
                    {RecordTypeLabels[type]}
                  </Button>
                );
              })
            )}
          </div>
          {/* 时间范围 */}
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 12, marginBottom: 6 }}>时间范围</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {([
              { key: 'week' as PeriodType, label: '近7天' },
              { key: 'month' as PeriodType, label: '近30天' },
              { key: 'quarter' as PeriodType, label: '近90天' },
              { key: 'all' as PeriodType, label: '全部' },
            ]).map((item) => {
              const isActive = period === item.key;
              return (
                <Button
                  key={item.key}
                  style={{
                    borderRadius: 20,
                    ...(isActive
                      ? { background: '#faad14', borderColor: '#faad14', color: '#fff' }
                      : { borderColor: 'var(--color-border)' }),
                  }}
                  onClick={() => setPeriod(item.key)}
                >
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : (
        <Card style={{ marginBottom: 16 }}>
          <Space wrap size="middle">
            <Select
              placeholder="选择家庭成员"
              style={{ width: 150 }}
              value={memberId}
              onChange={setMemberId}
            >
              {members?.map((member) => (
                <Select.Option key={member.id} value={member.id}>
                  {member.name}
                </Select.Option>
              ))}
            </Select>

            <Select
              placeholder="选择指标类型"
              style={{ width: 180 }}
              value={recordType}
              onChange={setRecordType}
            >
              {Object.entries(RecordTypeGroups).map(([groupKey, group]) => (
                <Select.OptGroup key={groupKey} label={group.label}>
                  {group.types.map((type) => (
                    <Select.Option key={type} value={type}>
                      {RecordTypeLabels[type]}
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>

            <Radio.Group value={period} onChange={(e) => setPeriod(e.target.value)}>
              <Radio.Button value="week">近7天</Radio.Button>
              <Radio.Button value="month">近30天</Radio.Button>
              <Radio.Button value="quarter">近90天</Radio.Button>
              <Radio.Button value="all">全部</Radio.Button>
            </Radio.Group>
          </Space>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
          </div>
        ) : !memberId || !recordType ? (
          <Empty description="请选择家庭成员和指标类型" />
        ) : trendData && trendData.data.length === 0 ? (
          <Empty description="暂无数据" />
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: 400 }} />
        )}
      </Card>

      {renderStatistics()}
    </div>
  );
};

export default RecordTrend;
