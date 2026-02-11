// 测试标题生成 API（使用 undici，和后端一致）
const { ProxyAgent, fetch } = require('undici');

const GOOGLE_API_KEY = 'AIzaSyDvDUSROxgzHUN0I8m7mTEWzdEKP1zzau0';
const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';
const GEMINI_MODEL = 'gemini-3-flash-preview';
const PROXY = 'http://localhost:20808';

// 创建代理
const proxyAgent = new ProxyAgent(PROXY);

// 模拟的用户问题和 AI 回答
const testCases = [
  {
    userQuestion: '关于杨训杰的健康问题「肾功能受损风险」，请帮我详细解读一下这个问题的严重程度，以及我应该如何应对？',
    aiResponse: '根据您提供的健康数据，杨训杰目前的肾功能指标显示存在一定的受损风险。主要表现为肌酐值略高于正常范围，eGFR（估算肾小球滤过率）处于临界水平。建议您：1. 定期复查肾功能指标；2. 控制血压和血糖；3. 减少高蛋白饮食；4. 多喝水，保持充足的水分摄入。'
  },
  {
    userQuestion: '我最近血压有点高，应该怎么办？',
    aiResponse: '血压偏高需要引起重视。建议您：1. 减少盐分摄入，每天不超过6克；2. 保持规律运动，每周至少150分钟中等强度运动；3. 戒烟限酒；4. 保持良好的睡眠；5. 定期监测血压并记录。如果血压持续偏高，建议就医。'
  }
];

// 构建请求
function buildPrompt(userQuestion, aiResponse) {
  return `根据下面的健康咨询对话，生成一个简短的中文标题。

用户问题：${userQuestion.substring(0, 200)}

AI回答摘要：${aiResponse.substring(0, 500)}

请生成一个8-15个字的标题，概括这次健康咨询的主题。例如："血压偏高的饮食建议"、"糖尿病日常注意事项"、"体检报告异常指标分析"。

直接输出标题内容：`;
}

// 发送请求
async function sendRequest(prompt, options = {}) {
  const requestBody = {
    model: GEMINI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 50
  };

  console.log('\n请求体:');
  console.log(JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${GOOGLE_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GOOGLE_API_KEY}`
    },
    body: JSON.stringify(requestBody),
    dispatcher: proxyAgent
  });

  console.log(`\n响应状态: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.log('错误响应:', errorText);
    return null;
  }

  const data = await response.json();
  return data;
}

// 主测试函数
async function runTests() {
  console.log('========== 标题生成 API 测试 ==========\n');

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`--- 测试 ${i + 1} ---`);
    console.log(`用户问题: ${testCase.userQuestion.substring(0, 50)}...`);

    const prompt = buildPrompt(testCase.userQuestion, testCase.aiResponse);

    try {
      const data = await sendRequest(prompt);

      if (data) {
        console.log('\n完整响应:');
        console.log(JSON.stringify(data, null, 2));

        if (data.choices?.[0]?.message?.content) {
          const content = data.choices[0].message.content;
          console.log(`\n>>> 提取的标题: "${content}"`);
          console.log(`>>> 标题长度: ${content.length} 字符`);
        }
      }
    } catch (error) {
      console.error('请求失败:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');
  }

  // 额外测试：尝试不同的 prompt 格式
  console.log('--- 额外测试：简化 prompt ---');
  const simplePrompt = '请用10个中文字左右概括这个对话主题：用户询问肾功能受损风险，AI解释了风险程度并给出了饮食和复查建议。';

  try {
    const data = await sendRequest(simplePrompt, { maxTokens: 30 });
    if (data?.choices?.[0]?.message?.content) {
      console.log(`\n>>> 简化 prompt 返回: "${data.choices[0].message.content}"`);
    }
  } catch (error) {
    console.error('请求失败:', error.message);
  }

  // 测试不同的 max_tokens 值
  console.log('\n--- 测试不同 max_tokens 值 ---');
  const testPrompt = '请生成一个10字左右的标题来概括：用户咨询血压偏高问题，AI给出了饮食和运动建议。只输出标题：';

  for (const maxTokens of [100, 200, 500]) {
    console.log(`\nmax_tokens = ${maxTokens}:`);
    try {
      const data = await sendRequest(testPrompt, { maxTokens });
      if (data?.choices?.[0]?.message?.content) {
        console.log(`>>> 返回: "${data.choices[0].message.content}"`);
      } else {
        console.log('>>> 无内容返回');
        console.log('finish_reason:', data?.choices?.[0]?.finish_reason);
      }
    } catch (error) {
      console.error('请求失败:', error.message);
    }
  }
}

runTests().catch(console.error);
