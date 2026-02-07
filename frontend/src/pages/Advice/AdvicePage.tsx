import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Select,
  Button,
  Space,
  Spin,
  Empty,
  Progress,
  List,
  Tag,
  Collapse,
  Alert,
  Divider,
  Modal,
  Row,
  Col,
  message,
  Popconfirm,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
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
  DeleteOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adviceApi, membersApi } from '../../api';
import type { HealthAdvice, Concern, Suggestion, ActionItem } from '../../types';
import {
  ConcernLevelConfig,
  ActionPriorityConfig,
  SuggestionCategoryIcons,
} from '../../types';
import dayjs from 'dayjs';

const AdvicePage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [selectedAdvice, setSelectedAdvice] = useState<HealthAdvice | null>(null);

  // 长按相关状态
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [longPressItem, setLongPressItem] = useState<{ type: string; title: string; content: string } | null>(null);

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
  const handleAskAI = useCallback(() => {
    if (!longPressItem || !selectedMemberId) return;
    const question = generateQuestion(longPressItem.type, longPressItem.title, longPressItem.content);
    // 跳转到聊天页面，传递 memberId 和预填充的问题
    navigate(`/chat?memberId=${selectedMemberId}&question=${encodeURIComponent(question)}`);
    setLongPressItem(null);
  }, [longPressItem, selectedMemberId, generateQuestion, navigate]);

  // 长按开始
  const handleLongPressStart = useCallback((type: string, title: string, content: string) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressItem({ type, title, content });
    }, 500); // 500ms 触发长按
  }, []);

  // 长按结束
  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // 右键菜单项
  const contextMenuItems: MenuProps['items'] = [
    {
      key: 'ask-ai',
      label: '咨询 AI',
      icon: <MessageOutlined />,
      onClick: handleAskAI,
    },
  ];

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const { data: adviceList, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['advice', selectedMemberId],
    queryFn: () => adviceApi.getAll({ memberId: selectedMemberId }),
    enabled: showHistory || !!selectedMemberId,
  });

  // 检查是否有新的健康数据
  const { data: newDataCheck } = useQuery({
    queryKey: ['advice-check', selectedMemberId],
    queryFn: () => adviceApi.checkNewData(selectedMemberId!),
    enabled: !!selectedMemberId,
  });

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
        itemLayout="horizontal"
        dataSource={concerns}
        renderItem={(item) => (
          <Dropdown
            menu={{ items: contextMenuItems }}
            trigger={['contextMenu']}
            onOpenChange={(open) => {
              if (open) {
                setLongPressItem({ type: 'concern', title: item.title, content: item.description });
              }
            }}
          >
            <List.Item
              style={{ cursor: 'pointer' }}
              onTouchStart={() => handleLongPressStart('concern', item.title, item.description)}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressEnd}
            >
              <List.Item.Meta
                avatar={getIcon(item.level)}
                title={
                  <Space>
                    <span>{item.title}</span>
                    <Tag color={ConcernLevelConfig[item.level as keyof typeof ConcernLevelConfig]?.color}>
                      {ConcernLevelConfig[item.level as keyof typeof ConcernLevelConfig]?.label}
                    </Tag>
                  </Space>
                }
                description={item.description}
              />
            </List.Item>
          </Dropdown>
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
      <Collapse
        defaultActiveKey={suggestions.map((_, i) => i.toString())}
        items={suggestions.map((item, index) => ({
          key: index.toString(),
          label: (
            <Dropdown
              menu={{ items: contextMenuItems }}
              trigger={['contextMenu']}
              onOpenChange={(open) => {
                if (open) {
                  setLongPressItem({ type: 'suggestion', title: item.title, content: item.content });
                }
              }}
            >
              <div
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                onTouchStart={() => handleLongPressStart('suggestion', item.title, item.content)}
                onTouchEnd={handleLongPressEnd}
                onTouchCancel={handleLongPressEnd}
              >
                <span>{SuggestionCategoryIcons[item.category] || '📝'}</span>
                <Tag>{item.category}</Tag>
                <span>{item.title}</span>
              </div>
            </Dropdown>
          ),
          children: <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.content}</p>,
        }))}
      />
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
          <Dropdown
            menu={{ items: contextMenuItems }}
            trigger={['contextMenu']}
            onOpenChange={(open) => {
              if (open) {
                setLongPressItem({ type: 'action', title: item.text, content: '' });
              }
            }}
          >
            <List.Item
              style={{ cursor: 'pointer' }}
              onTouchStart={() => handleLongPressStart('action', item.text, '')}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressEnd}
            >
              <List.Item.Meta
                avatar={
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
                    }}
                  >
                    {index + 1}
                  </span>
                }
                title={
                  <Space>
                    <span>{item.text}</span>
                    <Tag color={ActionPriorityConfig[item.priority as keyof typeof ActionPriorityConfig]?.color}>
                      {ActionPriorityConfig[item.priority as keyof typeof ActionPriorityConfig]?.label}优先级
                    </Tag>
                  </Space>
                }
              />
            </List.Item>
          </Dropdown>
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
              <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0 }}>
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

      <Alert
        message="免责声明"
        description="AI 健康建议仅供参考，不能替代专业医疗诊断和治疗。如有健康问题，请及时咨询专业医生。"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card style={{ marginBottom: 24 }}>
        <Space size="middle" wrap>
          <span>选择家庭成员：</span>
          <Select
            placeholder="请选择"
            style={{ width: 200 }}
            value={selectedMemberId}
            onChange={(value) => {
              setSelectedMemberId(value);
              setSelectedAdvice(null);
            }}
          >
            {members?.map((member) => (
              <Select.Option key={member.id} value={member.id}>
                {member.name}
              </Select.Option>
            ))}
          </Select>
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
          {selectedMemberId && (
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setShowHistory(true)}
            >
              历史建议
            </Button>
          )}
        </Space>

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
            ) : newDataCheck.lastAdviceDate ? (
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
        width={700}
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
                <List.Item>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 16 }}>
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
                    <Space>
                      <Button
                        type="primary"
                        size="small"
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
                          size="small"
                          danger
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

      {/* 长按菜单（移动端） */}
      <Modal
        title="操作"
        open={!!longPressItem}
        onCancel={() => setLongPressItem(null)}
        footer={null}
        width={300}
        centered
      >
        <div style={{ padding: '8px 0' }}>
          <Button
            type="text"
            icon={<MessageOutlined />}
            onClick={handleAskAI}
            block
            style={{ textAlign: 'left', height: 48 }}
          >
            咨询 AI
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdvicePage;
