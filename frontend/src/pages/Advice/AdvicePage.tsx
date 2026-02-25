import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Spin,
  Empty,
  Progress,
  List,
  Tag,
  Alert,
  Divider,
  Modal,
  Row,
  Col,
  message,
  Popconfirm,
  Typography,
} from 'antd';
import {
  RobotOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  MessageOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adviceApi, membersApi, chatApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { HealthAdvice, Concern, Suggestion, ActionItem } from '../../types';
import {
  ConcernLevelConfig,
  ActionPriorityConfig,
  SuggestionCategoryIcons,
} from '../../types';
import { useElderModeStore } from '../../store';
import dayjs from 'dayjs';

// 条目样式
const itemStyle: React.CSSProperties = {
  borderRadius: 8,
  margin: '4px 0',
};

const AdvicePage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isElderMode = useElderModeStore((s) => s.isElderMode);
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [selectedAdvice, setSelectedAdvice] = useState<HealthAdvice | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(
    () => localStorage.getItem('advice_disclaimer_dismissed') === 'true'
  );
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 历史聊天弹窗状态
  const [chatHistoryModal, setChatHistoryModal] = useState<{
    visible: boolean;
    itemType: 'concern' | 'suggestion' | 'action';
    itemIndex: number;
    itemTitle: string;
  } | null>(null);

  // 数据查询
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  // 查询所有成员的最新建议（用于默认选中拥有最新建议的成员）
  const { data: latestAdviceAll } = useQuery({
    queryKey: ['advice-all-latest'],
    queryFn: () => adviceApi.getAll(),
  });

  // 生成咨询问题
  const generateQuestion = useCallback((type: string, title: string, content: string) => {
    const memberName = members?.find(m => m.id === selectedMemberId)?.name || '';
    switch (type) {
      case 'concern':
        return `关于${memberName}的健康问题「${title}」，AI 建议提到：${content}。请详细解释一下这个问题的严重程度、可能的原因，以及我应该采取哪些具体措施？`;
      case 'suggestion':
        return `关于${memberName}的健康建议「${title}」，AI 提到：${content}。请更详细地解释一下这个建议，包括具体应该怎么做、需要注意什么、大概需要多长时间能看到效果？`;
      case 'action':
        return `关于${memberName}的行动项「${title}」，请详细说明一下：为什么这个行动很重要？具体应该怎么执行？有什么注意事项？`;
      default:
        return `请详细解释一下「${title}」：${content}`;
    }
  }, [members, selectedMemberId]);

  // 跳转到聊天页面
  const handleAskAI = useCallback((
    type: 'concern' | 'suggestion' | 'action',
    index: number,
    title: string,
    content: string,
  ) => {
    if (!selectedMemberId || !selectedAdvice) return;
    const question = generateQuestion(type, title, content);

    // 构建完整的 URL 参数，包含来源信息
    const params = new URLSearchParams({
      memberId: selectedMemberId,
      question,
      sourceAdviceId: selectedAdvice.id,
      sourceItemType: type,
      sourceItemIndex: String(index),
      sourceItemTitle: title,
    });

    navigate(`/chat?${params.toString()}`);
  }, [selectedMemberId, selectedAdvice, generateQuestion, navigate]);

  const { data: adviceList, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['advice', selectedMemberId],
    queryFn: () => adviceApi.getAll({ memberId: selectedMemberId }),
    enabled: showHistory || !!selectedMemberId,
  });

  // 获取当前建议的会话统计
  const { data: sessionStats } = useQuery({
    queryKey: ['advice-session-stats', selectedAdvice?.id],
    queryFn: () => chatApi.getAdviceSessionStats(selectedAdvice!.id),
    enabled: !!selectedAdvice,
  });

  // 获取条目关联的历史会话
  const { data: chatHistorySessions, isLoading: isLoadingChatHistory } = useQuery({
    queryKey: ['advice-sessions', selectedAdvice?.id, chatHistoryModal?.itemType, chatHistoryModal?.itemIndex],
    queryFn: () => chatApi.getSessionsByAdvice(selectedAdvice!.id, {
      itemType: chatHistoryModal!.itemType,
      itemIndex: chatHistoryModal!.itemIndex,
    }),
    enabled: !!selectedAdvice && !!chatHistoryModal,
  });

  // 检查是否有新的健康数据
  const { data: newDataCheck } = useQuery({
    queryKey: ['advice-check', selectedMemberId],
    queryFn: () => adviceApi.checkNewData(selectedMemberId!),
    enabled: !!selectedMemberId,
  });

  // 只有一个可见成员时，隐藏成员选择 UI
  const isSingleMember = members?.length === 1;

  // 默认选中拥有最新健康建议的成员，没有建议时 fallback 到"自己"或第一个
  useEffect(() => {
    if (!members?.length || selectedMemberId) return;
    // 找到拥有最新建议的成员
    if (latestAdviceAll?.length) {
      const latestMemberId = latestAdviceAll[0].memberId;
      if (members.some((m) => m.id === latestMemberId)) {
        setSelectedMemberId(latestMemberId);
        return;
      }
    }
    // fallback: 选自己或第一个
    const user = useAuthStore.getState().user;
    const myMember = user ? members.find((m) => m.userId === user.id) : null;
    setSelectedMemberId(myMember?.id || members[0].id);
  }, [members, latestAdviceAll, selectedMemberId, setSelectedMemberId]);

  // 当建议列表加载完成且当前没有选中建议时，自动展示最新的一条
  useEffect(() => {
    if (adviceList && adviceList.length > 0 && !selectedAdvice) {
      setSelectedAdvice(adviceList[0]);
    }
  }, [adviceList, selectedAdvice]);

  const generateMutation = useMutation({
    mutationFn: adviceApi.generate,
    onSuccess: (data) => {
      message.success('健康建议生成成功');
      setSelectedAdvice(data);
      queryClient.invalidateQueries({ queryKey: ['advice'] });
      queryClient.invalidateQueries({ queryKey: ['advice-check', selectedMemberId] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '生成失败，请稍后重试');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adviceApi.delete,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['advice'] });
      queryClient.invalidateQueries({ queryKey: ['advice-check', selectedMemberId] });
      // 如果删除的是当前选中的建议，清空选中
      if (selectedAdvice && adviceList && adviceList.length > 1) {
        const remaining = adviceList.filter((a) => a.id !== selectedAdvice.id);
        setSelectedAdvice(remaining[0] || null);
      } else {
        setSelectedAdvice(null);
      }
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  const handleGenerate = () => {
    if (!selectedMemberId) {
      message.warning('请先选择家庭成员');
      return;
    }
    generateMutation.mutate({ memberId: selectedMemberId });
  };

  // 渲染咨询按钮和历史聊天徽章
  const renderAskButton = (
    type: 'concern' | 'suggestion' | 'action',
    index: number,
    title: string,
    content: string,
  ) => {
    const count = sessionStats?.[type]?.[index] || 0;

    return (
      <Space size={8}>
        {/* 历史聊天按钮 */}
        {count > 0 && (
          <Button
            type="text"
            icon={<HistoryOutlined style={{ fontSize: 18 }} />}
            onClick={(e) => {
              e.stopPropagation();
              setChatHistoryModal({ visible: true, itemType: type, itemIndex: index, itemTitle: title });
            }}
            style={{
              color: 'var(--color-primary)',
              opacity: 0.7,
              transition: 'opacity 0.2s',
              width: 36,
              height: 36,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          />
        )}
        <Popconfirm
          title="咨询 AI"
          description="针对这条内容向 AI 提问？"
          onConfirm={() => handleAskAI(type, index, title, content)}
          okText="确定"
          cancelText="取消"
          placement="topRight"
          okButtonProps={{ size: 'middle', style: { minWidth: 60 } }}
          cancelButtonProps={{ size: 'middle', style: { minWidth: 60 } }}
        >
          <Button
            type="text"
            icon={<MessageOutlined style={{ fontSize: 18 }} />}
            onClick={(e) => e.stopPropagation()}
            style={{
              color: 'var(--color-primary)',
              opacity: 0.7,
              transition: 'opacity 0.2s',
              width: 36,
              height: 36,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          />
        </Popconfirm>
      </Space>
    );
  };

  // 渲染健康评分
  const renderHealthScore = (score: number | null) => {
    if (score === null) return null;

    let status: 'success' | 'normal' | 'exception' = 'normal';
    let color = '#136dec';
    let text = '一般';

    if (score >= 90) {
      status = 'success';
      color = '#13ec5b';
      text = '优秀';
    } else if (score >= 80) {
      color = '#13ec5b';
      text = '良好';
    } else if (score >= 70) {
      color = '#faad14';
      text = '一般';
    } else if (score >= 60) {
      color = '#fa8c16';
      text = '欠佳';
    } else {
      status = 'exception';
      color = '#ff4d4f';
      text = '较差';
    }

    return (
      <div style={{ textAlign: 'center' }}>
        <Progress
          type="circle"
          percent={score}
          strokeColor={color}
          status={status}
          format={(percent) => (
            <div>
              <div style={{ fontSize: 32, fontWeight: 'bold' }}>{percent}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-quaternary)' }}>{text}</div>
            </div>
          )}
        />
      </div>
    );
  };

  // 渲染关注事项
  const renderConcerns = (concerns: Concern[]) => {
    if (!concerns || concerns.length === 0) {
      return <Empty description="暂无需要关注的事项" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    const getIcon = (level: string) => {
      switch (level) {
        case 'critical':
          return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
        case 'warning':
          return <WarningOutlined style={{ color: '#faad14' }} />;
        default:
          return <InfoCircleOutlined style={{ color: '#136dec' }} />;
      }
    };

    return (
      <List
        itemLayout="vertical"
        dataSource={concerns}
        renderItem={(item, index) => (
          <List.Item style={itemStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: isElderMode ? 18 : 16, marginTop: 5.5 }}>{getIcon(item.level)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Space>
                    <span style={{ fontWeight: 500, lineHeight: '22px', fontSize: isElderMode ? 17 : undefined }}>{item.title}</span>
                    <Tag color={ConcernLevelConfig[item.level as keyof typeof ConcernLevelConfig]?.color}>
                      {ConcernLevelConfig[item.level as keyof typeof ConcernLevelConfig]?.label}
                    </Tag>
                  </Space>
                  {renderAskButton('concern', index, item.title, item.description)}
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: isElderMode ? 16 : 14, lineHeight: isElderMode ? 1.8 : undefined }}>
                  {item.description}
                </div>
              </div>
            </div>
          </List.Item>
        )}
      />
    );
  };

  // 渲染健康建议
  const renderSuggestions = (suggestions: Suggestion[]) => {
    if (!suggestions || suggestions.length === 0) {
      return <Empty description="暂无健康建议" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {suggestions.map((item, index) => (
          <div
            key={index}
            style={{
              border: '1px solid var(--color-border, #d9d9d9)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--color-bg-hover)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{SuggestionCategoryIcons[item.category] || '📝'}</span>
                <Tag>{item.category}</Tag>
                <span style={{ fontWeight: 500, fontSize: isElderMode ? 17 : undefined }}>{item.title}</span>
              </div>
              {renderAskButton('suggestion', index, item.title, item.content)}
            </div>
            <div style={{ padding: '12px 16px' }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: isElderMode ? 16 : undefined, lineHeight: isElderMode ? 1.8 : undefined }}>{item.content}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染行动清单
  const renderActionItems = (actionItems: ActionItem[]) => {
    if (!actionItems || actionItems.length === 0) {
      return <Empty description="暂无行动清单" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={actionItems}
        renderItem={(item, index) => (
          <List.Item
            style={itemStyle}
                      >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              <span
                style={{
                  display: 'inline-flex',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-bg-hover)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space wrap>
                  <span style={{ fontSize: isElderMode ? 16 : undefined }}>{item.text}</span>
                  <Tag color={ActionPriorityConfig[item.priority as keyof typeof ActionPriorityConfig]?.color}>
                    {ActionPriorityConfig[item.priority as keyof typeof ActionPriorityConfig]?.label}优先级
                  </Tag>
                </Space>
                {renderAskButton('action', index, item.text, '')}
              </div>
            </div>
          </List.Item>
        )}
      />
    );
  };

  // 渲染建议报告
  const renderAdviceReport = (advice: HealthAdvice) => {
    return (
      <div>
        <Row gutter={24}>
          <Col xs={24} md={8}>
            <Card title="健康评分" bordered={false}>
              {renderHealthScore(advice.healthScore)}
              <Divider />
              <p style={{ textAlign: 'center', color: '#666', margin: 0 }}>
                生成时间：{dayjs(advice.generatedAt).format('YYYY-MM-DD HH:mm')}
              </p>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card title="健康概述" bordered={false}>
              <p style={{ fontSize: isElderMode ? 17 : 15, lineHeight: 1.8, margin: 0 }}>
                {advice.summary}
              </p>
            </Card>
          </Col>
        </Row>

        <Card title="需要关注" style={{ marginTop: 16 }}>
          {renderConcerns(advice.concerns)}
        </Card>

        <Card title="健康建议" style={{ marginTop: 16 }}>
          {renderSuggestions(advice.suggestions)}
        </Card>

        <Card title="行动清单" style={{ marginTop: 16 }}>
          {renderActionItems(advice.actionItems)}
        </Card>
      </div>
    );
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>
        <RobotOutlined style={{ marginRight: 8 }} />
        AI 健康建议
      </h2>

      {!disclaimerDismissed && (isElderMode || isMobile) && (
        <div
          style={{
            marginBottom: 24,
            border: '1px solid #faad14',
            borderRadius: 8,
            background: '#fffbe6',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              cursor: 'pointer',
            }}
            onClick={() => setDisclaimerExpanded(!disclaimerExpanded)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ad6800', fontWeight: 500, fontSize: isElderMode ? 16 : 14 }}>
              <WarningOutlined />
              免责声明
            </span>
            <span style={{ color: '#ad6800', fontSize: 12 }}>{disclaimerExpanded ? '收起' : '展开'}</span>
          </div>
          {disclaimerExpanded && (
            <div style={{ padding: '0 12px 10px' }}>
              <div style={{ color: '#ad6800', fontSize: isElderMode ? 15 : 13, lineHeight: 1.6, marginBottom: 8 }}>
                AI 健康建议仅供参考，不能替代专业医疗诊断和治疗。如有健康问题，请及时咨询专业医生。
              </div>
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  localStorage.setItem('advice_disclaimer_dismissed', 'true');
                  setDisclaimerDismissed(true);
                }}
              >
                我已明白，不再显示
              </Button>
            </div>
          )}
        </div>
      )}
      {!disclaimerDismissed && !isElderMode && !isMobile && (
        <Alert
          message="免责声明"
          description="AI 健康建议仅供参考，不能替代专业医疗诊断和治疗。如有健康问题，请及时咨询专业医生。"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 老年版：Card 内容全空时（单成员+无新数据+历史≤1）隐藏整个 Card */}
      {!(isElderMode && isSingleMember && !newDataCheck?.hasNewData && (!adviceList || adviceList.length < 2)) && (
      <Card style={{ marginBottom: 24 }}>
        {isElderMode ? (
          <>
            {/* 成员气泡独立一行（单成员时隐藏） */}
            {!isSingleMember && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {members?.map((member) => (
                  <Button
                    key={member.id}
                    type={selectedMemberId === member.id ? 'primary' : 'default'}
                    style={{
                      borderRadius: 20,
                      minWidth: 80,
                      ...(selectedMemberId === member.id ? {} : { borderColor: 'var(--color-border)' }),
                    }}
                    onClick={() => {
                      if (selectedMemberId !== member.id) {
                        setSelectedMemberId(member.id);
                        setSelectedAdvice(null);
                      }
                    }}
                  >
                    {member.name}
                  </Button>
                ))}
              </div>
            )}
            {/* 操作按钮独立一行 */}
            {selectedMemberId && (
              <div style={{ display: 'flex', gap: 8 }}>
                {newDataCheck?.hasNewData && (
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleGenerate}
                    loading={generateMutation.isPending}
                    style={{ flex: 1, background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
                  >
                    {newDataCheck.lastAdviceDate ? '重新生成建议' : '生成健康建议'}
                  </Button>
                )}
                {adviceList && adviceList.length >= 2 && (
                  <Button
                    icon={<HistoryOutlined />}
                    onClick={() => setShowHistory(true)}
                    style={{ flex: newDataCheck?.hasNewData ? undefined : 1, borderColor: 'var(--color-border)' }}
                  >
                    历史建议
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            {!isSingleMember && (
              <>
                <span>家庭成员：</span>
                {members?.map((member) => (
                  <Button
                    key={member.id}
                    type={selectedMemberId === member.id ? 'primary' : 'default'}
                    style={{
                      borderRadius: 20,
                      minWidth: 80,
                      ...(selectedMemberId === member.id ? {} : {
                        borderColor: 'var(--color-border)',
                      }),
                    }}
                    onClick={() => {
                      if (selectedMemberId !== member.id) {
                        setSelectedMemberId(member.id);
                        setSelectedAdvice(null);
                      }
                    }}
                  >
                    {member.name}
                  </Button>
                ))}
              </>
            )}
            <div style={{ flex: 1 }} />
            {selectedMemberId && newDataCheck?.hasNewData && (
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleGenerate}
                loading={generateMutation.isPending}
              >
                {newDataCheck.lastAdviceDate ? '重新生成建议' : '生成健康建议'}
              </Button>
            )}
            {selectedMemberId && adviceList && adviceList.length >= 2 && (
              <Button
                icon={<HistoryOutlined />}
                onClick={() => setShowHistory(true)}
              >
                历史建议
              </Button>
            )}
          </div>
        )}

        {selectedMemberId && newDataCheck && (
          <div style={{ marginTop: 12 }}>
            {newDataCheck.hasNewData ? (
              <Alert
                type="info"
                showIcon
                message={
                  newDataCheck.lastAdviceDate
                    ? `自上次建议（${dayjs(newDataCheck.lastAdviceDate).format('YYYY-MM-DD')}）以来，有新的健康数据：${[
                        newDataCheck.newDocuments > 0 ? `${newDataCheck.newDocuments} 份文档` : '',
                        newDataCheck.newRecords > 0 ? `${newDataCheck.newRecords} 条记录` : '',
                      ].filter(Boolean).join('、')}，建议重新生成健康建议。`
                    : `检测到 ${[
                        newDataCheck.newDocuments > 0 ? `${newDataCheck.newDocuments} 份文档` : '',
                        newDataCheck.newRecords > 0 ? `${newDataCheck.newRecords} 条记录` : '',
                      ].filter(Boolean).join('、')}，可以生成健康建议。`
                }
                icon={newDataCheck.lastAdviceDate ? <DatabaseOutlined /> : <FileTextOutlined />}
              />
            ) : newDataCheck.lastAdviceDate && !isElderMode ? (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message={`当前建议基于最新数据（生成于 ${dayjs(newDataCheck.lastAdviceDate).format('YYYY-MM-DD')}），暂无新的健康数据需要更新。`}
              />
            ) : null}
          </div>
        )}
      </Card>
      )}

      {generateMutation.isPending && (
        <Card>
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: 'var(--color-text-tertiary)' }}>
              AI 正在分析健康数据，请稍候...
            </p>
          </div>
        </Card>
      )}

      {!generateMutation.isPending && selectedAdvice && (
        renderAdviceReport(selectedAdvice)
      )}

      {!generateMutation.isPending && !selectedAdvice && (
        <Card>
          <Empty
            description="请选择家庭成员并点击生成按钮获取 AI 健康建议"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}

      <Modal
        title={`${members?.find((m) => m.id === selectedMemberId)?.name || ''}的历史健康建议`}
        open={showHistory}
        onCancel={() => setShowHistory(false)}
        footer={null}
        width={isMobile ? '95vw' : 700}
        styles={{ body: { padding: isMobile ? '12px 8px' : undefined } }}
      >
        {isLoadingHistory ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin />
          </div>
        ) : adviceList && adviceList.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={adviceList}
            renderItem={(item) => {
              const score = item.healthScore || 0;
              const scoreColor = score >= 80 ? '#13ec5b' : score >= 60 ? '#faad14' : '#ff4d4f';
              return (
                <List.Item style={{ padding: isMobile ? '12px 0' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: isMobile ? 10 : 16 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        border: `3px solid ${scoreColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: 16,
                        color: scoreColor,
                        flexShrink: 0,
                      }}
                    >
                      {score}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{dayjs(item.generatedAt).format('YYYY-MM-DD')}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                        健康评分 {score} 分
                      </div>
                    </div>
                    <Space size={8}>
                      <Button
                        type="primary"
                        style={{ borderRadius: 16 }}
                        onClick={() => {
                          setSelectedAdvice(item);
                          setShowHistory(false);
                        }}
                      >
                        查看
                      </Button>
                      <Popconfirm
                        title="确定要删除这条健康建议吗？"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          deleteMutation.mutate(item.id);
                        }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="删除"
                        cancelText="取消"
                      >
                        <Button
                          danger
                          style={{ borderRadius: 16 }}
                          loading={deleteMutation.isPending}
                          onClick={(e) => e.stopPropagation()}
                        >
                          删除
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty description="暂无历史建议" />
        )}
      </Modal>

      {/* 历史聊天记录弹窗 */}
      <Modal
        title={`「${chatHistoryModal?.itemTitle || ''}」的相关咨询记录`}
        open={!!chatHistoryModal}
        onCancel={() => setChatHistoryModal(null)}
        footer={null}
        width={500}
      >
        {isLoadingChatHistory ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin />
          </div>
        ) : chatHistorySessions && chatHistorySessions.length > 0 ? (
          <List
            dataSource={chatHistorySessions}
            renderItem={(session) => (
              <List.Item
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Space size={12}>
                  <MessageOutlined style={{ fontSize: 22, color: '#136dec' }} />
                  <Typography.Text style={{ fontSize: 15 }}>
                    {dayjs(session.createdAt).format('YYYY-MM-DD HH:mm')}
                  </Typography.Text>
                </Space>
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  style={{ borderRadius: 16 }}
                  onClick={() => {
                    setChatHistoryModal(null);
                    navigate(`/chat?sessionId=${session.id}`);
                  }}
                >
                  查看
                </Button>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无相关咨询记录" />
        )}
      </Modal>
    </div>
  );
};

export default AdvicePage;
