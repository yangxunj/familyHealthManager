import { useState, useEffect } from 'react';
import { Drawer, Button, InputNumber, message, Avatar, Empty, Spin } from 'antd';
import ScrollNumberPicker from '../../components/ScrollNumberPicker';
import {
  HeartOutlined,
  ExperimentOutlined,
  DashboardOutlined,
  FundOutlined,
  ArrowLeftOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recordsApi, membersApi } from '../../api';
import { RecordTypeUnits } from '../../types';
import type { RecordType, RecordItem } from '../../types';
import dayjs from 'dayjs';

type WizardCategory = 'bloodPressure' | 'bloodSugar' | 'bloodLipid' | 'basic';

interface ElderRecordWizardProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES: {
  key: WizardCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  desc: string;
}[] = [
  {
    key: 'bloodPressure',
    label: '血压监测',
    icon: <HeartOutlined style={{ fontSize: 32 }} />,
    color: '#ff4d4f',
    bg: '#fff1f0',
    desc: '收缩压、舒张压、心率',
  },
  {
    key: 'bloodSugar',
    label: '血糖监测',
    icon: <ExperimentOutlined style={{ fontSize: 32 }} />,
    color: '#136dec',
    bg: '#e6f4ff',
    desc: '空腹血糖、餐后血糖',
  },
  {
    key: 'bloodLipid',
    label: '血脂检测',
    icon: <FundOutlined style={{ fontSize: 32 }} />,
    color: '#722ed1',
    bg: '#f9f0ff',
    desc: '总胆固醇、甘油三酯、HDL、LDL',
  },
  {
    key: 'basic',
    label: '基础指标',
    icon: <DashboardOutlined style={{ fontSize: 32 }} />,
    color: '#faad14',
    bg: '#fffbe6',
    desc: '体重、体温、血氧等',
  },
];

const BASIC_TYPES: { key: RecordType; label: string; hint: string }[] = [
  { key: 'WEIGHT', label: '体重 (kg)', hint: '' },
  { key: 'HEIGHT', label: '身高 (cm)', hint: '' },
  { key: 'WAIST', label: '腰围 (cm)', hint: '' },
  { key: 'TEMPERATURE', label: '体温 (°C)', hint: '36.1 ~ 37.2 正常' },
  { key: 'BLOOD_OXYGEN', label: '血氧 (%)', hint: '95 ~ 100 正常' },
];

const GLUCOSE_TYPES: { key: RecordType; label: string; hint: string }[] = [
  { key: 'FASTING_GLUCOSE', label: '空腹血糖', hint: '3.9 ~ 6.1 正常' },
  { key: 'POSTPRANDIAL_GLUCOSE', label: '餐后血糖', hint: '3.9 ~ 7.8 正常' },
];

const ElderRecordWizard: React.FC<ElderRecordWizardProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<WizardCategory | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState('');

  // Sub-type for basic / blood sugar
  const [subType, setSubType] = useState<RecordType | null>(null);
  // Single value (basic, blood sugar)
  const [singleValue, setSingleValue] = useState<number | null>(null);
  // Blood pressure values (defaults to common normal values for scroll picker)
  const [bpValues, setBpValues] = useState({ systolic: 120, diastolic: 80, heartRate: 72 });
  // Blood lipid values
  const [lipidValues, setLipidValues] = useState<{
    tc: number | null; tg: number | null; hdl: number | null; ldl: number | null;
  }>({ tc: null, tg: null, hdl: null, ldl: null });

  const { data: members } = useQuery({ queryKey: ['members'], queryFn: () => membersApi.getAll() });

  // 单成员时跳过成员选择步骤
  const isSingleMember = members?.length === 1;

  // 获取最近的血压历史记录，用于预填充滚轮默认值
  const { data: latestBp, isLoading: latestBpLoading } = useQuery({
    queryKey: ['records', 'latestBp', memberId],
    queryFn: async () => {
      const records = await recordsApi.getAll({ memberId: memberId! });
      const systolic = records.find(r => r.recordType === 'SYSTOLIC_BP');
      const diastolic = records.find(r => r.recordType === 'DIASTOLIC_BP');
      const heartRate = records.find(r => r.recordType === 'HEART_RATE');
      return {
        systolic: systolic ? Math.round(systolic.value) : null,
        diastolic: diastolic ? Math.round(diastolic.value) : null,
        heartRate: heartRate ? Math.round(heartRate.value) : null,
      };
    },
    enabled: !!memberId && category === 'bloodPressure',
  });

  // 血压滚轮就绪标志：确保历史数据加载完毕后再渲染滚轮，避免初始化竞争
  const [bpReady, setBpReady] = useState(false);

  useEffect(() => {
    if (category === 'bloodPressure' && step === 2 && !latestBpLoading) {
      if (latestBp) {
        setBpValues({
          systolic: latestBp.systolic ?? 120,
          diastolic: latestBp.diastolic ?? 80,
          heartRate: latestBp.heartRate ?? 72,
        });
      }
      setBpReady(true);
    }
  }, [category, step, latestBpLoading, latestBp]);

  const createMutation = useMutation({
    mutationFn: recordsApi.create,
    onSuccess: () => {
      message.success('记录添加成功');
      queryClient.invalidateQueries({ queryKey: ['records'] });
      handleClose();
    },
    onError: () => message.error('添加失败，请重试'),
  });

  const createBatchMutation = useMutation({
    mutationFn: recordsApi.createBatch,
    onSuccess: () => {
      message.success('记录添加成功');
      queryClient.invalidateQueries({ queryKey: ['records'] });
      handleClose();
    },
    onError: () => message.error('添加失败，请重试'),
  });

  const resetAll = () => {
    setStep(0);
    setCategory(null);
    setMemberId(null);
    setMemberName('');
    setSubType(null);
    setSingleValue(null);
    setBpValues({ systolic: 120, diastolic: 80, heartRate: 72 });
    setBpReady(false);
    setLipidValues({ tc: null, tg: null, hdl: null, ldl: null });
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleBack = () => {
    if (step === 0) {
      handleClose();
    } else if (step === 1) {
      setStep(0);
    } else if (step === 2) {
      // 单成员时跳过 step 1，直接回到 step 0
      setStep(isSingleMember ? 0 : 1);
      setSubType(null);
      setSingleValue(null);
      setBpValues({ systolic: 120, diastolic: 80, heartRate: 72 });
      setBpReady(false);
      setLipidValues({ tc: null, tg: null, hdl: null, ldl: null });
    }
  };

  const handleSubmit = () => {
    if (!memberId || !category) return;
    const recordDate = dayjs().toISOString();

    if (category === 'bloodPressure') {
      const records: RecordItem[] = [
        { recordType: 'SYSTOLIC_BP', value: bpValues.systolic, unit: 'mmHg' },
        { recordType: 'DIASTOLIC_BP', value: bpValues.diastolic, unit: 'mmHg' },
        { recordType: 'HEART_RATE', value: bpValues.heartRate, unit: '次/分' },
      ];
      createBatchMutation.mutate({ memberId, recordDate, records });
    } else if (category === 'bloodLipid') {
      const records: RecordItem[] = [];
      if (lipidValues.tc != null) records.push({ recordType: 'TOTAL_CHOLESTEROL', value: lipidValues.tc, unit: 'mmol/L' });
      if (lipidValues.tg != null) records.push({ recordType: 'TRIGLYCERIDES', value: lipidValues.tg, unit: 'mmol/L' });
      if (lipidValues.hdl != null) records.push({ recordType: 'HDL', value: lipidValues.hdl, unit: 'mmol/L' });
      if (lipidValues.ldl != null) records.push({ recordType: 'LDL', value: lipidValues.ldl, unit: 'mmol/L' });
      if (records.length === 0) { message.warning('请至少填写一项血脂数据'); return; }
      createBatchMutation.mutate({ memberId, recordDate, records });
    } else if (category === 'bloodSugar') {
      if (!subType || singleValue == null) { message.warning('请填写完整数据'); return; }
      createMutation.mutate({ memberId, recordDate, recordType: subType, value: singleValue, unit: RecordTypeUnits[subType] });
    } else if (category === 'basic') {
      if (!subType || singleValue == null) { message.warning('请填写完整数据'); return; }
      createMutation.mutate({ memberId, recordDate, recordType: subType, value: singleValue, unit: RecordTypeUnits[subType] });
    }
  };

  const isSubmitting = createMutation.isPending || createBatchMutation.isPending;
  const getCategoryLabel = () => CATEGORIES.find((c) => c.key === category)?.label || '';

  /* ================================================================
   * Render helpers
   * ================================================================ */

  const renderInputRow = (
    label: string,
    hint: string,
    value: number | null,
    onChange: (v: number | null) => void,
    opts?: { min?: number; max?: number; precision?: number; addonAfter?: string },
  ) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <InputNumber
        value={value}
        onChange={onChange}
        min={opts?.min ?? 0}
        max={opts?.max}
        precision={opts?.precision ?? 1}
        style={{ width: '100%' }}
        size="large"
        placeholder="请输入"
        addonAfter={opts?.addonAfter}
      />
      {hint && (
        <div style={{ fontSize: 13, color: 'var(--color-text-quaternary)', marginTop: 4 }}>
          参考范围：{hint}
        </div>
      )}
    </div>
  );

  const renderSubTypeSelector = (
    types: { key: RecordType; label: string; hint: string }[],
    selected: RecordType | null,
    onSelect: (key: RecordType) => void,
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
      {types.map((t) => {
        const isActive = selected === t.key;
        return (
          <div
            key={t.key}
            onClick={() => { onSelect(t.key); setSingleValue(null); }}
            style={{
              padding: '14px 20px',
              borderRadius: 12,
              border: isActive ? '2px solid #136dec' : '2px solid var(--color-border)',
              background: isActive ? '#e6f4ff' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
          >
            <span style={{ fontSize: 17, fontWeight: isActive ? 600 : 400 }}>{t.label}</span>
            {t.hint && <span style={{ fontSize: 13, color: 'var(--color-text-quaternary)' }}>{t.hint}</span>}
          </div>
        );
      })}
    </div>
  );

  /* ---- Step 0: Select Category ---- */
  const renderCategoryStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      {CATEGORIES.map((cat) => (
        <div
          key={cat.key}
          onClick={() => {
            setCategory(cat.key);
            if (isSingleMember && members?.[0]) {
              // 单成员跳过选人步骤，直接到输入
              setMemberId(members[0].id);
              setMemberName(members[0].name);
              setStep(2);
            } else {
              setStep(1);
            }
          }}
          style={{
            background: cat.bg,
            borderRadius: 16,
            padding: '20px 24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
        >
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: cat.color,
            flexShrink: 0,
          }}>
            {cat.icon}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: cat.color }}>{cat.label}</div>
            <div style={{ fontSize: 14, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{cat.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );

  /* ---- Step 1: Select Member ---- */
  const renderMemberStep = () => (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 15, color: 'var(--color-text-tertiary)', textAlign: 'center', marginBottom: 8 }}>
        {getCategoryLabel()} — 请选择记录对象
      </div>
      {!members || members.length === 0 ? (
        <Empty description="暂无家庭成员" />
      ) : (
        members.map((member) => (
          <div
            key={member.id}
            onClick={() => { setMemberId(member.id); setMemberName(member.name); setStep(2); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 20px',
              borderRadius: 12,
              border: '2px solid var(--color-border)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
          >
            <Avatar
              size={48}
              icon={<UserOutlined />}
              src={member.avatar}
              style={{ backgroundColor: member.gender === 'MALE' ? '#136dec' : '#eb2f96', flexShrink: 0 }}
            />
            <span style={{ fontSize: 18, fontWeight: 500 }}>{member.name}</span>
          </div>
        ))
      )}
    </div>
  );

  /* ---- Step 2: Input Data ---- */
  const renderInputStep = () => {
    if (!category) return null;

    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 18, color: 'var(--color-text-tertiary)', textAlign: 'center', marginBottom: 20 }}>
          为 <strong>{memberName}</strong> 记录{getCategoryLabel()}
        </div>

        {category === 'bloodPressure' && (!bpReady ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <div>
            {/* 收缩压 + 舒张压 并排 */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, marginBottom: 2 }}>收缩压（高压）</div>
                <ScrollNumberPicker min={60} max={250} value={bpValues.systolic}
                  onChange={(v) => setBpValues({ ...bpValues, systolic: v })} suffix="mmHg" visibleCount={5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, marginBottom: 2 }}>舒张压（低压）</div>
                <ScrollNumberPicker min={30} max={160} value={bpValues.diastolic}
                  onChange={(v) => setBpValues({ ...bpValues, diastolic: v })} suffix="mmHg" visibleCount={5} />
              </div>
            </div>
            {/* 心率 单独一行，居中窄一些 */}
            <div style={{ maxWidth: '60%', margin: '8px auto 0' }}>
              <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, marginBottom: 2 }}>心率</div>
              <ScrollNumberPicker min={30} max={200} value={bpValues.heartRate}
                onChange={(v) => setBpValues({ ...bpValues, heartRate: v })} suffix="次/分" visibleCount={3} />
            </div>
          </div>
        ))}

        {category === 'bloodLipid' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>总胆固醇 (TC)</div>
              <InputNumber
                value={lipidValues.tc}
                onChange={(v) => setLipidValues({ ...lipidValues, tc: v })}
                min={0} max={20} precision={2}
                style={{ width: '100%' }} size="large" placeholder="如 3.28"
                addonAfter="mmol/L"
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-quaternary)', marginTop: 4 }}>合适：&lt;5.18</div>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>甘油三酯 (TG)</div>
              <InputNumber
                value={lipidValues.tg}
                onChange={(v) => setLipidValues({ ...lipidValues, tg: v })}
                min={0} max={20} precision={2}
                style={{ width: '100%' }} size="large" placeholder="如 1.18"
                addonAfter="mmol/L"
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-quaternary)', marginTop: 4 }}>合适：&lt;1.70</div>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>高密度脂蛋白 (HDL)</div>
              <InputNumber
                value={lipidValues.hdl}
                onChange={(v) => setLipidValues({ ...lipidValues, hdl: v })}
                min={0} max={10} precision={2}
                style={{ width: '100%' }} size="large" placeholder="如 0.77"
                addonAfter="mmol/L"
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-quaternary)', marginTop: 4 }}>合适：≥1.04</div>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>低密度脂蛋白 (LDL)</div>
              <InputNumber
                value={lipidValues.ldl}
                onChange={(v) => setLipidValues({ ...lipidValues, ldl: v })}
                min={0} max={10} precision={2}
                style={{ width: '100%' }} size="large" placeholder="如 1.97"
                addonAfter="mmol/L"
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-quaternary)', marginTop: 4 }}>合适：&lt;3.37</div>
            </div>
          </div>
        )}

        {category === 'bloodSugar' && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>选择血糖类型</div>
            {renderSubTypeSelector(GLUCOSE_TYPES, subType, setSubType)}
            {subType && renderInputRow(
              GLUCOSE_TYPES.find((t) => t.key === subType)!.label,
              GLUCOSE_TYPES.find((t) => t.key === subType)!.hint,
              singleValue,
              setSingleValue,
              { precision: 2, addonAfter: RecordTypeUnits[subType] },
            )}
          </>
        )}

        {category === 'basic' && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>选择指标</div>
            {renderSubTypeSelector(BASIC_TYPES, subType, setSubType)}
            {subType && renderInputRow(
              BASIC_TYPES.find((t) => t.key === subType)!.label,
              BASIC_TYPES.find((t) => t.key === subType)!.hint,
              singleValue,
              setSingleValue,
              { precision: 1, addonAfter: RecordTypeUnits[subType] },
            )}
          </>
        )}
      </div>
    );
  };

  /* ================================================================ */

  const STEP_TITLES_FULL = ['选择记录类型', '选择家庭成员', '输入数据'];
  const STEP_TITLES_SHORT = ['选择记录类型', '输入数据'];
  const stepTitles = isSingleMember ? STEP_TITLES_SHORT : STEP_TITLES_FULL;
  // 映射当前 step 到显示的步骤索引（单成员时 step 0→0, step 2→1）
  const displayStepIndex = isSingleMember ? (step === 0 ? 0 : 1) : step;
  const totalSteps = isSingleMember ? 2 : 3;

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      placement="bottom"
      height="85%"
      closable={false}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
      destroyOnClose
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 8px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack} style={{ fontSize: 18 }} />
        <span style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 600 }}>
          {stepTitles[displayStepIndex]}
        </span>
        <div style={{ width: 40 }} />
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0', flexShrink: 0 }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            style={{
              width: i === displayStepIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i <= displayStepIndex ? '#136dec' : '#e0e0e0',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {step === 0 && renderCategoryStep()}
        {step === 1 && renderMemberStep()}
        {step === 2 && renderInputStep()}
      </div>

      {/* Footer - submit button on step 2 */}
      {step === 2 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
          <Button
            block
            size="large"
            onClick={handleSubmit}
            loading={isSubmitting}
            style={{ height: 52, fontSize: 18, borderRadius: 12, background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
          >
            提交记录
          </Button>
        </div>
      )}
    </Drawer>
  );
};

export default ElderRecordWizard;
