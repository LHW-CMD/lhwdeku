// 游戏配置
const BOARD_SIZE = 15; // 15x15棋盘
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const CLICK_TOLERANCE = 0.35; // 触摸设备适当放宽容差（35%）

// 游戏状态
let gameBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
let currentPlayer = BLACK;
let gameActive = true;
let winningLine = [];
let currentUser = null; // 当前登录用户
let cellSize = 0; // 单元格大小（动态计算）
let isTouchDevice = false; // 是否为触摸设备

// DOM元素
let boardElement, currentPlayerElement, winModal, winMessage, winnerIcon;
let restartBtn, newGameBtn, authModal, loginForm, registerForm;
let goRegister, goLogin, loginBtn, registerBtn;
let authError, errorMessage, userInfo, usernameDisplay, logoutBtn;

// 初始化函数 - 增加设备检测
function init() {
  // 检测是否为触摸设备
  detectTouchDevice();
  
  // 确保DOM完全加载后再获取元素
  if (document.readyState === "complete" || document.readyState === "interactive") {
    initDOMElements();
    initAuthForm();
    checkLoginStatus();
    // 监听窗口大小变化，实时调整棋盘
    window.addEventListener('resize', debounce(handleResize, 100));
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      initDOMElements();
      initAuthForm();
      checkLoginStatus();
      window.addEventListener('resize', debounce(handleResize, 100));
    });
  }
}

// 检测触摸设备
function detectTouchDevice() {
  isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
  console.log('触摸设备:', isTouchDevice);
}

// 防抖函数 - 优化窗口 resize 性能
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// 窗口大小变化处理
function handleResize() {
  if (currentUser && gameActive && boardElement) {
    const currentBoardState = JSON.parse(JSON.stringify(gameBoard));
    const currentWinningLine = [...winningLine];
    const currentGameActive = gameActive;
    
    initBoard();
    
    // 恢复棋盘状态
    gameBoard = currentBoardState;
    winningLine = currentWinningLine;
    gameActive = currentGameActive;
    
    // 重新放置棋子
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (gameBoard[y][x] !== EMPTY) {
          placeStone(x, y, gameBoard[y][x], true); // 跳过动画
        }
      }
    }
    
    // 恢复获胜高亮
    if (winningLine.length > 0) {
      highlightWinningLine();
    }
  }
}

// 初始化DOM元素
function initDOMElements() {
  // 游戏核心元素
  boardElement = document.getElementById('board');
  currentPlayerElement = document.getElementById('current-player');
  winModal = document.getElementById('win-modal');
  winMessage = document.getElementById('win-message');
  winnerIcon = document.getElementById('winner-icon');
  restartBtn = document.getElementById('restart-btn');
  newGameBtn = document.getElementById('new-game-btn');
  
  // 登录相关元素
  authModal = document.getElementById('auth-modal');
  loginForm = document.getElementById('login-form');
  registerForm = document.getElementById('register-form');
  goRegister = document.getElementById('go-register');
  goLogin = document.getElementById('go-login');
  loginBtn = document.getElementById('login-btn');
  registerBtn = document.getElementById('register-btn');
  authError = document.getElementById('auth-error');
  errorMessage = document.getElementById('error-message');
  userInfo = document.getElementById('user-info');
  usernameDisplay = document.getElementById('username-display');
  logoutBtn = document.getElementById('logout-btn');
  
  // 绑定游戏控制事件
  if (restartBtn) restartBtn.addEventListener('click', restartGame);
  if (newGameBtn) newGameBtn.addEventListener('click', restartGame);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

// 检查登录状态
function checkLoginStatus() {
  const savedUser = localStorage.getItem('gomokuUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      showGameInterface();
      setTimeout(() => {
        initBoard();
      }, 100);
    } catch (e) {
      localStorage.removeItem('gomokuUser');
      showError('登录状态异常，请重新登录');
    }
  }
}

// 初始化登录注册表单 - 优化触摸交互
function initAuthForm() {
  if (!loginForm || !registerForm) return;
  
  // 切换登录/注册表单
  if (goRegister) {
    goRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
    });
  }
  
  if (goLogin) {
    goLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    });
  }
  
  // 账号密码登录 - 优化触摸点击
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
    
    // 支持键盘回车登录
    const loginInputs = [
      document.getElementById('login-username'),
      document.getElementById('login-password')
    ];
    loginInputs.forEach(input => {
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            handleLogin();
          }
        });
      }
    });
  }
  
  // 注册逻辑 - 优化触摸点击
  if (registerBtn) {
    registerBtn.addEventListener('click', handleRegister);
    
    // 支持键盘回车注册
    const regInputs = [
      document.getElementById('reg-username'),
      document.getElementById('reg-phone'),
      document.getElementById('reg-password')
    ];
    regInputs.forEach(input => {
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            handleRegister();
          }
        });
      }
    });
  }
}

// 登录处理函数 - 分离逻辑便于维护
function handleLogin() {
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');
  
  if (!loginUsername || !loginUsername.value.trim()) {
    showError('请输入用户名');
    loginUsername.focus();
    return;
  }
  
  if (!loginPassword || !loginPassword.value.trim()) {
    showError('请输入密码');
    loginPassword.focus();
    return;
  }
  
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();
  
  // 读取用户数据
  let users = [];
  try {
    const usersStr = localStorage.getItem('gomokuUsers');
    if (usersStr) {
      users = JSON.parse(usersStr);
    }
  } catch (e) {
    users = [];
    console.error('读取用户数据失败：', e);
    showError('系统异常，请刷新页面重试');
    return;
  }
  
  // 匹配用户名和密码
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    currentUser = user;
    localStorage.setItem('gomokuUser', JSON.stringify(user));
    showGameInterface();
    setTimeout(() => {
      initBoard();
    }, 100);
  } else {
    showError('用户名或密码错误');
  }
}

// 注册处理函数 - 分离逻辑便于维护
function handleRegister() {
  const regUsername = document.getElementById('reg-username');
  const regPhone = document.getElementById('reg-phone');
  const regPassword = document.getElementById('reg-password');
  
  // 用户名验证
  if (!regUsername || !regUsername.value.trim() || regUsername.value.trim().length < 3 || regUsername.value.trim().length > 16) {
    showError('请输入3-16位的用户名');
    regUsername.focus();
    return;
  }
  
  // 手机号验证（选填）
  if (regPhone && regPhone.value.trim() && !/^1[3-9]\d{9}$/.test(regPhone.value.trim())) {
    showError('请输入有效的手机号');
    regPhone.focus();
    return;
  }
  
  // 密码验证
  if (!regPassword || !regPassword.value.trim() || regPassword.value.trim().length < 6 || regPassword.value.trim().length > 16) {
    showError('请输入6-16位的密码');
    regPassword.focus();
    return;
  }
  
  // 读取现有用户数据
  let users = [];
  try {
    const usersStr = localStorage.getItem('gomokuUsers');
    if (usersStr) {
      users = JSON.parse(usersStr);
    }
  } catch (e) {
    users = [];
  }
  
  // 检查用户名是否已存在
  if (users.some(u => u.username === regUsername.value.trim())) {
    showError('用户名已存在');
    regUsername.focus();
    return;
  }
  
  // 注册成功
  const newUser = {
    id: Date.now().toString(),
    username: regUsername.value.trim(),
    phone: regPhone ? regPhone.value.trim() : '',
    password: regPassword.value.trim(),
    registerTime: new Date().toLocaleString()
  };
  
  users.push(newUser);
  localStorage.setItem('gomokuUsers', JSON.stringify(users));
  localStorage.setItem('gomokuUser', JSON.stringify(newUser));
  currentUser = newUser;
  
  showError('注册成功，正在登录...', 'success');
  setTimeout(() => {
    showGameInterface();
    initBoard();
  }, 1000);
}

// 显示错误提示 - 优化移动设备显示
function showError(msg, type = 'error') {
  if (!authError || !errorMessage) return;
  
  errorMessage.textContent = msg;
  authError.classList.remove('hidden');
  authError.classList.add('animate-fade-in');
  
  if (type === 'success') {
    authError.classList.remove('bg-red-500');
    authError.classList.add('bg-green-500');
  } else {
    authError.classList.remove('bg-green-500');
    authError.classList.add('bg-red-500');
  }
  
  // 触摸设备延长显示时间
  const delay = isTouchDevice ? 4000 : 3000;
  setTimeout(() => {
    authError.classList.add('hidden');
  }, delay);
}

// 显示游戏界面
function showGameInterface() {
  if (authModal) authModal.classList.add('hidden');
  if (userInfo) userInfo.classList.remove('hidden');
  if (usernameDisplay && currentUser) usernameDisplay.textContent = currentUser.username;
  if (logoutBtn) logoutBtn.classList.remove('hidden');
}

// 退出登录
function handleLogout() {
  localStorage.removeItem('gomokuUser');
  currentUser = null;
  if (authModal) authModal.classList.remove('hidden');
  if (userInfo) userInfo.classList.add('hidden');
  if (logoutBtn) logoutBtn.classList.add('hidden');
  
  // 重置游戏状态
  gameBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
  gameActive = false;
  winningLine = [];
  if (boardElement) boardElement.innerHTML = '';
}

// 初始化棋盘 - 响应式适配核心
function initBoard() {
  if (!boardElement) return;
  
  // 清空棋盘
  boardElement.innerHTML = '';
  gameBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
  currentPlayer = BLACK;
  gameActive = true;
  winningLine = [];
  if (winModal) winModal.classList.add('hidden');
  
  // 重置平局时隐藏的元素
  if (winnerIcon) winnerIcon.style.display = 'block';
  const winModalP = document.querySelector('#win-modal p');
  if (winModalP) winModalP.textContent = '恭喜你赢得比赛！';
  
  // 动态计算单元格大小（适应不同屏幕）
  const boardSize = Math.min(boardElement.clientWidth, boardElement.clientHeight);
  cellSize = boardSize / BOARD_SIZE;
  
  // 更新棋盘背景网格（关键响应式适配）
  boardElement.style.backgroundSize = `${cellSize}px ${cellSize}px`;
  
  // 更新当前玩家显示
  updateCurrentPlayerDisplay();
  
  // 移除旧事件绑定
  boardElement.removeEventListener('click', handleBoardClick);
  boardElement.removeEventListener('touchstart', handleTouchStart);
  
  // 添加事件绑定
  boardElement.addEventListener('click', handleBoardClick);
  if (isTouchDevice) {
    boardElement.addEventListener('touchstart', handleTouchStart);
    // 禁止触摸设备的默认行为
    boardElement.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }
  
  // 添加棋盘星位点 - 适应不同尺寸
  addStarPoints();
}

// 添加棋盘星位点 - 响应式适配
function addStarPoints() {
  if (!boardElement) return;
  
  // 15x15棋盘的星位点位置（x,y）
  const starPoints = [
    [3, 3], [3, 11], 
    [7, 7], 
    [11, 3], [11, 11]
  ];
  
  starPoints.forEach(([x, y]) => {
    const starPoint = document.createElement('div');
    // 星位点大小随棋盘尺寸自适应
    const starSize = isTouchDevice ? 6 : 8;
    starPoint.style.width = `${starSize}px`;
    starPoint.style.height = `${starSize}px`;
    starPoint.style.backgroundColor = '#8B4513';
    starPoint.style.borderRadius = '50%';
    // 精确计算位置
    starPoint.style.left = `${x * cellSize + cellSize/2 - starSize/2}px`;
    starPoint.style.top = `${y * cellSize + cellSize/2 - starSize/2}px`;
    starPoint.style.zIndex = '1';
    starPoint.style.position = 'absolute';
    boardElement.appendChild(starPoint);
  });
}

// 处理鼠标点击 - 电脑端
function handleBoardClick(e) {
  if (!gameActive || !currentUser || !boardElement) return;
  
  // 获取点击位置（相对于棋盘）
  const rect = boardElement.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  processMove(x, y);
}

// 处理触摸点击 - 手机端核心优化
function handleTouchStart(e) {
  e.preventDefault(); // 防止滚动和缩放
  if (!gameActive || !currentUser || !boardElement) return;
  
  // 获取触摸位置
  const touch = e.touches[0];
  const rect = boardElement.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  
  processMove(x, y);
}

// 统一处理落子逻辑 - 电脑+手机共用
function processMove(x, y) {
  // 计算所在格子
  const gridX = Math.floor(x / cellSize);
  const gridY = Math.floor(y / cellSize);
  
  // 精确校验：只允许点击格子中心区域
  const gridCenterX = gridX * cellSize + cellSize / 2;
  const gridCenterY = gridY * cellSize + cellSize / 2;
  
  const offsetX = Math.abs(x - gridCenterX);
  const offsetY = Math.abs(y - gridCenterY);
  
  // 超出容差范围则不响应
  if (offsetX > cellSize * CLICK_TOLERANCE || offsetY > cellSize * CLICK_TOLERANCE) {
    return;
  }
  
  // 检查位置是否合法
  if (gridX >= 0 && gridX < BOARD_SIZE && gridY >= 0 && gridY < BOARD_SIZE && gameBoard[gridY][gridX] === EMPTY) {
    // 落子
    placeStone(gridX, gridY, currentPlayer);
    
    // 检查胜利
    if (checkWin(gridX, gridY, currentPlayer)) {
      gameActive = false;
      highlightWinningLine();
      setTimeout(() => showWinModal(currentPlayer), 500);
      return;
    }
    
    // 检查平局
    if (checkDraw()) {
      gameActive = false;
      setTimeout(() => showDrawModal(), 500);
      return;
    }
    
    // 切换玩家
    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    updateCurrentPlayerDisplay();
  }
}

// 落子 - 优化触摸设备体验
function placeStone(x, y, player, skipAnimation = false) {
  if (!boardElement) return;
  
  gameBoard[y][x] = player;
  
  // 精确计算棋子位置
  const left = x * cellSize + cellSize/2;
  const top = y * cellSize + cellSize/2;
  
  const stone = document.createElement('div');
  
  // 棋子大小适配（触摸设备略大）
  const stoneSize = isTouchDevice ? cellSize * 0.85 : cellSize * 0.8;
  stone.style.width = `${stoneSize}px`;
  stone.style.height = `${stoneSize}px`;
  stone.style.backgroundColor = player === BLACK ? '#111111' : '#F8F8F8';
  stone.style.borderRadius = '50%';
  stone.style.left = `${left}px`;
  stone.style.top = `${top}px`;
  stone.style.transform = 'translate(-50%, -50%)';
  stone.style.boxShadow = player === BLACK ? '0 2px 6px rgba(0, 0, 0, 0.5)' : '0 2px 6px rgba(0, 0, 0, 0.2)';
  stone.style.zIndex = '2';
  stone.style.position = 'absolute';
  
  // 触摸设备跳过动画，提升响应速度
  if (skipAnimation || isTouchDevice) {
    stone.style.opacity = '1';
  } else {
    stone.style.opacity = '0';
    stone.style.transform = 'translate(-50%, -50%) scale(0.5)';
    stone.style.transition = 'all 0.2s ease-out';
    
    // 触发动画
    setTimeout(() => {
      stone.style.opacity = '1';
      stone.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);
  }
  
  boardElement.appendChild(stone);
  
  // 存储棋子位置信息
  stone.dataset.x = x;
  stone.dataset.y = y;
}

// 检查胜利
function checkWin(x, y, player) {
  const directions = [
    [0, 1],  // 垂直
    [1, 0],  // 水平
    [1, 1],  // 对角线
    [1, -1]  // 反对角线
  ];
  
  for (const [dx, dy] of directions) {
    let count = 1;
    let line = [[x, y]];
    
    // 正方向检查
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && gameBoard[ny][nx] === player) {
        count++;
        line.push([nx, ny]);
      } else {
        break;
      }
    }
    
    // 反方向检查
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && gameBoard[ny][nx] === player) {
        count++;
        line.push([nx, ny]);
      } else {
        break;
      }
    }
    
    // 五子连线
    if (count >= 5) {
      winningLine = line;
      return true;
    }
  }
  
  return false;
}

// 高亮显示获胜连线 - 适配触摸设备
function highlightWinningLine() {
  if (!boardElement) return;
  
  const stones = boardElement.querySelectorAll('div[data-x]');
  const highlightClass = isTouchDevice ? 'touch-win-highlight' : 'win-animation';
  
  // 添加触摸设备专用高亮样式
  if (isTouchDevice && !document.querySelector('.touch-win-style')) {
    const style = document.createElement('style');
    style.className = 'touch-win-style';
    style.textContent = `
      .touch-win-highlight {
        animation: touchWinPulse 1s infinite alternate;
        box-shadow: 0 0 15px 3px rgba(255, 107, 53, 0.9) !important;
      }
      @keyframes touchWinPulse {
        0% { transform: scale(1) translate(-50%, -50%); }
        100% { transform: scale(1.05) translate(-50%, -50%); }
      }
    `;
    document.head.appendChild(style);
  }
  
  winningLine.forEach(([x, y]) => {
    for (const stone of stones) {
      if (parseInt(stone.dataset.x) === x && parseInt(stone.dataset.y) === y) {
        stone.classList.add(highlightClass);
        break;
      }
    }
  });
}

// 检查平局
function checkDraw() {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (gameBoard[y][x] === EMPTY) {
        return false; // 还有空位，不是平局
      }
    }
  }
  return true; // 棋盘已满，平局
}

// 更新当前玩家显示
function updateCurrentPlayerDisplay() {
  if (currentPlayerElement) {
    currentPlayerElement.style.backgroundColor = currentPlayer === BLACK ? '#111111' : '#F8F8F8';
    // 触摸设备增大当前玩家指示器
    currentPlayerElement.style.width = isTouchDevice ? '20px' : '16px';
    currentPlayerElement.style.height = isTouchDevice ? '20px' : '16px';
  }
}

// 显示胜利模态框
function showWinModal(winner) {
  if (!winnerIcon || !winMessage || !winModal) return;
  
  winnerIcon.style.backgroundColor = winner === BLACK ? '#111111' : '#F8F8F8';
  winMessage.textContent = `${currentUser.username}（${winner === BLACK ? '黑方' : '白方'}）获胜！`;
  winModal.classList.remove('hidden');
}

// 显示平局模态框
function showDrawModal() {
  if (!winnerIcon || !winMessage || !winModal) return;
  
  winnerIcon.style.display = 'none';
  winMessage.textContent = '平局！';
  const winModalP = document.querySelector('#win-modal p');
  if (winModalP) winModalP.textContent = '棋盘已满，无人获胜！';
  winModal.classList.remove('hidden');
}

// 重新开始游戏
function restartGame() {
  initBoard();
}

// 棋子悬停预览 - 电脑端专用（触摸设备不显示）
if (!isTouchDevice) {
  document.addEventListener('DOMContentLoaded', () => {
    boardElement?.addEventListener('mousemove', (e) => {
      if (!gameActive || !currentUser || !cellSize || !boardElement) return;
      
      const rect = boardElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 计算所在格子
      const gridX = Math.floor(x / cellSize);
      const gridY = Math.floor(y / cellSize);
      
      // 精确校验：只在中心区域显示预览
      const gridCenterX = gridX * cellSize + cellSize / 2;
      const gridCenterY = gridY * cellSize + cellSize / 2;
      
      const offsetX = Math.abs(x - gridCenterX);
      const offsetY = Math.abs(y - gridCenterY);
      
      // 移除现有预览
      const existingPreview = document.querySelector('.preview-stone');
      if (existingPreview) {
        existingPreview.remove();
      }
      
      // 只在有效区域且格子为空时显示预览
      if (offsetX <= cellSize * CLICK_TOLERANCE && offsetY <= cellSize * CLICK_TOLERANCE && 
          gridX >= 0 && gridX < BOARD_SIZE && gridY >= 0 && gridY < BOARD_SIZE && 
          gameBoard[gridY][gridX] === EMPTY) {
        
        // 创建预览棋子
        const preview = document.createElement('div');
        preview.classList.add('preview-stone', 'piece-hover');
        preview.style.position = 'absolute';
        preview.style.width = `${cellSize * 0.7}px`;
        preview.style.height = `${cellSize * 0.7}px`;
        preview.style.backgroundColor = currentPlayer === BLACK ? '#111111' : '#F8F8F8';
        preview.style.borderRadius = '50%';
        preview.style.left = `${gridCenterX}px`;
        preview.style.top = `${gridCenterY}px`;
        preview.style.transform = 'translate(-50%, -50%)';
        preview.style.zIndex = '1';
        
        boardElement.appendChild(preview);
      }
    });
    
    // 鼠标离开棋盘时移除预览
    boardElement?.addEventListener('mouseleave', () => {
      const existingPreview = document.querySelector('.preview-stone');
      if (existingPreview) {
        existingPreview.remove();
      }
    });
  });
}

// 防止表单默认提交行为
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  });
});

// 页面加载完成后初始化
window.addEventListener('load', init);