// DOM
const passwordOutput = document.getElementById('passwordOutput');
const copyBtn = document.getElementById('copyBtn');
const copyTip = document.getElementById('copyTip');
const lengthRange = document.getElementById('lengthRange');
const lengthNumber = document.getElementById('lengthNumber');

const optUpper = document.getElementById('optUpper');
const optLower = document.getElementById('optLower');
const optNumber = document.getElementById('optNumber');
const optSymbol = document.getElementById('optSymbol');

const genBtn = document.getElementById('genBtn');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');
const warn = document.getElementById('warn');

// 字符集
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUM   = "0123456789";
const SYM   = "!@#$%^&*()_+-=[]{}|;:,.<>/?~";

// 双向绑定：长度滑条 / 数字框
function syncLength(e){
  const v = clamp(parseInt(e.target.value || 0,10), 4, 32);
  lengthRange.value = v;
  lengthNumber.value = v;
  updateStrengthPreview();
}
lengthRange.addEventListener('input', syncLength);
lengthNumber.addEventListener('input', syncLength);

// 复制按钮
copyBtn.addEventListener('click', async () => {
  const val = passwordOutput.value;
  if(!val){ setTip('无可复制的内容'); return; }
  try{
    await navigator.clipboard.writeText(val);
    setTip('已复制到剪贴板 ✔');
  }catch{
    setTip('复制失败，请手动选择复制');
  }
});
function setTip(t){
  copyTip.textContent = t;
  clearTimeout(setTip._t);
  setTip._t = setTimeout(()=> copyTip.textContent = '', 1500);
}

// 生成按钮
genBtn.addEventListener('click', () => {
  const sets = collectSets();
  if(sets.poolSize === 0){
    warn.hidden = false;                          // 5) 未勾选提醒
    pulse(warn);
    passwordOutput.value = '';
    updateStrength(0, 0);                         // 清空强度
    return;
  }
  warn.hidden = true;

  const len = Number(lengthRange.value);
  const pwd = generatePassword(len, sets.arrays);
  passwordOutput.value = pwd;

  const entropy = estimateEntropy(len, sets.poolSize);
  updateStrength(entropy, len);
});

// 勾选项变化时，预览强度条
[optUpper, optLower, optNumber, optSymbol].forEach(cb => {
  cb.addEventListener('change', updateStrengthPreview);
});
function updateStrengthPreview(){
  const sets = collectSets();
  const len = Number(lengthRange.value);
  const entropy = estimateEntropy(len, sets.poolSize);
  updateStrength(sets.poolSize === 0 ? 0 : entropy, len);
}

// 收集勾选的字符集
function collectSets(){
  const arrays = [];
  let poolSize = 0;
  if(optUpper.checked){ arrays.push(UPPER); poolSize += UPPER.length; }
  if(optLower.checked){ arrays.push(LOWER); poolSize += LOWER.length; }
  if(optNumber.checked){ arrays.push(NUM);   poolSize += NUM.length; }
  if(optSymbol.checked){ arrays.push(SYM);   poolSize += SYM.length; }
  return { arrays, poolSize };
}

// 生成密码：确保优先覆盖每个所选字符集至少 1 位，然后随机补足
function generatePassword(length, sets){
  const picks = [];
  // 先各取 1 个，保证包含性
  sets.forEach(s => picks.push(sample(s)));
  // 剩余随机
  while(picks.length < length){
    const s = sets[Math.floor(Math.random() * sets.length)];
    picks.push(sample(s));
  }
  // 打乱
  for(let i = picks.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.slice(0, length).join('');
}
function sample(str){ return str[Math.floor(Math.random()*str.length)]; }

// 估算熵：H = len * log2(poolSize)
function estimateEntropy(len, pool){
  if(pool <= 1 || len <= 0) return 0;
  const h = len * Math.log2(pool);
  return h; // bits
}

// 4) 强度条：根据熵与长度映射宽度与颜色
function updateStrength(entropy, len){
  // 将熵映射为 0-100 的百分比（上限 ~ 128 bits）
  const pct = Math.max(0, Math.min(100, Math.round(entropy / 1.28))); // 128 bits ≈ 100%
  strengthBar.style.width = pct + '%';

  let level = 'Very Weak';
  let color = 'var(--red)';

  // 分段阈值（可根据课程要求调整）
  if (entropy >= 128) { level = 'Excellent'; color = 'linear-gradient(90deg,#06b6d4,#22c55e)'; }
  else if (entropy >= 60){ level = 'Strong';    color = 'var(--green)'; }
  else if (entropy >= 36){ level = 'Medium';    color = 'var(--yellow)'; }
  else if (entropy >= 28){ level = 'Weak';      color = 'var(--orange)'; }
  else {                   level = 'Very Weak'; color = 'var(--red)'; }

  strengthText.textContent = `${level} (${Math.max(0, entropy|0)} bits)`;
  strengthBar.style.background = color;

  // 可视化小震动反馈（更新显著时）
  pulse(strengthBar);
}

// 小动效
function pulse(el){
  el.animate([{transform:'scale(1)'},{transform:'scale(1.02)'},{transform:'scale(1)'}],
             {duration:250, easing:'ease-out'});
}

function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }

// 初始化一次强度预览
updateStrengthPreview();
