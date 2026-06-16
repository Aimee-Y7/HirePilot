import cors from 'cors'
import crypto from 'node:crypto'
import express from 'express'
import fs from 'node:fs/promises'
import mammoth from 'mammoth'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'db.json')
const uploadDir = path.join(__dirname, 'uploads')
const port = Number(process.env.PORT ?? 4174)
const sessions = new Map()

const skillDictionary = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'SQL',
  '数据分析',
  '产品设计',
  '用户研究',
  '招聘',
  '薪酬',
  '绩效',
  'HRBP',
  '销售',
  'SaaS',
  'AI',
  'NLP',
  '运营',
  '项目管理',
]

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
})

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function nowLabel() {
  return new Date().toISOString()
}

function uniqSkills(skills) {
  return Array.from(
    new Set(skills.map((skill) => String(skill).trim()).filter(Boolean)),
  )
}

function parseSkills(input) {
  if (Array.isArray(input)) {
    return uniqSkills(input)
  }

  return uniqSkills(String(input ?? '').split(/[,，、\n]/))
}

function extractSkills(text) {
  const normalizedText = String(text ?? '').toLowerCase()

  return skillDictionary.filter((skill) =>
    normalizedText.includes(skill.toLowerCase()),
  )
}

function firstRegexMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)

    if (match?.[1]) {
      return match[1].trim().replace(/[，,；;。.\s]+$/, '')
    }
  }

  return ''
}

function cleanResumeLine(value) {
  return String(value ?? '')
    .trim()
    .replace(/^[•·\-–—*#\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanResumeProfileTitle(value) {
  return cleanResumeLine(value)
    .replace(
      /^(?:求职意向|目标岗位|应聘岗位|求职方向|意向岗位|目标职位|期望职位|岗位|职位|应聘|求职)[:：\s]+/,
      '',
    )
    .replace(/^[•·\-–—*#\s]+/, '')
    .replace(/[，,；;。.\s]+$/, '')
    .trim()
}

function normalizeOriginalName(fileName) {
  const originalName = String(fileName ?? '')

  if (!/[ÃÂäåçæ]/.test(originalName)) {
    return originalName
  }

  try {
    const decodedName = Buffer.from(originalName, 'latin1').toString('utf8')

    return decodedName.includes('�') ? originalName : decodedName
  } catch {
    return originalName
  }
}

function isLikelyChineseName(line) {
  return (
    /^[一-龥]{2,4}$/.test(line) &&
    !/(简历|求职|应聘|电话|手机|邮箱|工作|经验|技能|项目|教育|地址)/.test(line)
  )
}

function inferTitleFromLines(lines) {
  const titleKeywords = [
    'AI 招聘产品经理',
    '招聘产品经理',
    '产品经理',
    '前端工程师',
    '后端工程师',
    '全栈工程师',
    '数据分析师',
    '算法工程师',
    'NLP 算法工程师',
    '机器学习工程师',
    '招聘运营经理',
    '企业销售经理',
    '薪酬绩效专家',
    '用户研究员',
    '项目运营经理',
    'HRBP',
  ]
  const titleLine = lines.find((line) =>
    titleKeywords.some((keyword) => line.includes(keyword)),
  )

  if (!titleLine) {
    return ''
  }

  return titleKeywords.find((keyword) => titleLine.includes(keyword)) ?? ''
}

function deriveResumeProfile(text, fileName = '') {
  const content = String(text ?? '')
  const normalizedLines = content
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\t| {2,}|　+/))
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
  const compactText = normalizedLines.join('\n')
  const normalizedFileName = normalizeOriginalName(fileName)
  const cityMatch =
    compactText.match(
      /(?:现居地|所在地|所在城市|居住地|城市|期望城市|地址)[:：\s]*(上海|北京|深圳|杭州|广州|成都|南京|苏州|武汉|西安|远程)/,
    ) ??
    compactText.match(
      /(上海|北京|深圳|杭州|广州|成都|南京|苏州|武汉|西安|远程)/,
    )
  const experience = firstRegexMatch(compactText, [
    /(?:工作经验|从业经验|项目经验|年限|经验)[:：\s]*([0-9一二三四五六七八九十]+\s*年(?:以上)?)/,
    /([0-9一二三四五六七八九十]+\s*年(?:以上)?)(?:工作|经验|从业|B 端|B端|产品|研发|运营)/,
    /(?:拥有|具备|累计)([0-9一二三四五六七八九十]+\s*年(?:以上)?)/,
  ])
    .replace(/\s+/g, ' ')
    .replace(/\s*年/g, ' 年')
    .trim()
  const inferredName =
    firstRegexMatch(compactText, [
      /(?:姓名|名字|Name)[:：\s]+([^\n\r,，;；|｜]{2,12})/i,
      /^([一-龥]{2,4})\s*(?:\||｜|-|，|,|\s)+(?:求职|应聘|目标|岗位|方向)/,
      /^([一-龥]{2,4})\s*(?:\||｜|-|，|,|\s)+(?:[0-9一二三四五六七八九十]+\s*年|男|女|本科|硕士|博士)/,
    ]) ||
    normalizedLines.find(isLikelyChineseName) ||
    normalizedFileName
      .replace(/\.[^.]+$/, '')
      .match(/^([一-龥]{2,4})/)?.[1] ||
    ''
  const inferredTitle = cleanResumeProfileTitle(
    firstRegexMatch(compactText, [
      /(?:求职意向|目标岗位|应聘岗位|求职方向|意向岗位|目标职位|期望职位)[:：\s]+([^\n\r,，;；|｜]{2,32})/,
      /(?:应聘|求职)[:：\s]*([^\n\r,，;；|｜]{2,32})/,
    ]) || inferTitleFromLines(normalizedLines),
  )

  return {
    name: inferredName,
    title: inferredTitle,
    location: cityMatch?.[1] ?? '',
    experience,
    fileName: normalizedFileName,
  }
}

function deriveResumeHighlights(text, parsedProfile, skills) {
  const content = String(text ?? '')
  const lines = content
    .split(/\r?\n|。|；|;/)
    .map(cleanResumeLine)
    .filter((line) => line.length >= 12 && line.length <= 90)
  const scoredLines = lines
    .map((line) => {
      const score = [
        /主导|负责|搭建|建设|优化|推动|设计|落地/.test(line) ? 3 : 0,
        /AI|SaaS|招聘|简历|岗位|匹配|数据|分析|漏斗|候选人/.test(line) ? 3 : 0,
        /提升|增长|转化|效率|准确率|自动化|从 0 到 1|从0到1/.test(line) ? 2 : 0,
        skills.some((skill) => line.toLowerCase().includes(skill.toLowerCase()))
          ? 2
          : 0,
      ].reduce((total, value) => total + value, 0)

      return { line, score }
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)

  const highlights = uniqSkills(scoredLines.slice(0, 3).map((item) => item.line))

  if (highlights.length > 0) {
    return highlights.join('；')
  }

  const skillText = skills.slice(0, 5).join('、') || '岗位匹配'
  const titleText = parsedProfile.title || '目标岗位'
  const experienceText = parsedProfile.experience
    ? `${parsedProfile.experience}相关经验`
    : '具备相关项目经验'

  return `${experienceText}，方向聚焦${titleText}，核心能力覆盖${skillText}。`
}

function scoreMatch(candidateSkills, job, resumeText = '') {
  const requiredSkills = job.skills.length > 0 ? job.skills : ['通用能力']
  const matchedSkills = requiredSkills.filter((skill) =>
    candidateSkills.some(
      (candidateSkill) =>
        candidateSkill.toLowerCase() === skill.toLowerCase() ||
        candidateSkill.toLowerCase().includes(skill.toLowerCase()),
    ),
  )
  const skillScore = Math.round(
    (matchedSkills.length / requiredSkills.length) * 72,
  )
  const textBonus = requiredSkills.reduce((total, skill) => {
    return String(resumeText).toLowerCase().includes(skill.toLowerCase())
      ? total + 4
      : total
  }, 0)
  const coverageBonus = candidateSkills.length >= 5 ? 12 : 6

  return {
    score: Math.min(99, skillScore + textBonus + coverageBonus),
    matchedSkills,
  }
}

function seedDatabase() {
  const candidateUserId = 'user_candidate_demo'
  const recruiterUserId = 'user_recruiter_demo'
  const adminUserId = 'user_admin_demo'

  return {
    users: [
      {
        id: candidateUserId,
        name: '候选人演示',
        email: 'candidate@demo.com',
        passwordHash: hashPassword('demo123'),
        role: 'candidate',
        status: 'active',
        candidateId: 'cand_demo',
      },
      {
        id: recruiterUserId,
        name: '招聘方演示',
        email: 'recruiter@demo.com',
        passwordHash: hashPassword('demo123'),
        role: 'recruiter',
        status: 'active',
      },
      {
        id: adminUserId,
        name: '后台管理员',
        email: 'admin@demo.com',
        passwordHash: hashPassword('demo123'),
        role: 'admin',
        status: 'active',
      },
      {
        id: 'user_candidate_ops',
        name: '唐佳怡',
        email: 'tangjiayi@demo.com',
        passwordHash: hashPassword('demo123'),
        role: 'candidate',
        status: 'active',
        candidateId: 'cand_205',
      },
      {
        id: 'user_candidate_data',
        name: '郑浩',
        email: 'zhenghao@demo.com',
        passwordHash: hashPassword('demo123'),
        role: 'candidate',
        status: 'active',
        candidateId: 'cand_206',
      },
      {
        id: 'user_recruiter_data',
        name: '数据招聘负责人',
        email: 'data.recruiter@demo.com',
        passwordHash: hashPassword('demo123'),
        role: 'recruiter',
        status: 'active',
      },
      {
        id: 'user_recruiter_hr',
        name: '人力资源负责人',
        email: 'hr.recruiter@demo.com',
        passwordHash: hashPassword('demo123'),
        role: 'recruiter',
        status: 'active',
      },
    ],
    jobs: [
      {
        id: 'job_101',
        title: 'AI 招聘产品经理',
        department: '产品',
        location: '上海',
        type: '全职',
        level: '中高级',
        salary: '28k-45k',
        owner: '周敏',
        summary: '负责招聘智能体、简历解析、候选人匹配策略与招聘方工作台体验。',
        skills: ['产品设计', '用户研究', 'AI', '招聘', 'SaaS'],
        posted: '今天',
        stage: '热招',
        status: 'open',
        createdAt: nowLabel(),
      },
      {
        id: 'job_102',
        title: '前端工程师 React',
        department: '技术',
        location: '深圳',
        type: '全职',
        level: '3-5 年',
        salary: '25k-40k',
        owner: '林杰',
        summary: '建设候选人门户、招聘方筛选台和实时协同反馈组件。',
        skills: ['React', 'TypeScript', 'Node.js', 'SaaS'],
        posted: '2 天前',
        stage: '终面',
        status: 'open',
        createdAt: nowLabel(),
      },
      {
        id: 'job_103',
        title: 'HRBP 组织发展顾问',
        department: '人力资源',
        location: '北京',
        type: '全职',
        level: '5 年以上',
        salary: '22k-35k',
        owner: '赵颖',
        summary: '支持业务团队人才盘点、绩效方案、组织诊断与关键岗位招聘。',
        skills: ['HRBP', '绩效', '薪酬', '招聘', '项目管理'],
        posted: '3 天前',
        stage: '热招',
        status: 'open',
        createdAt: nowLabel(),
      },
      {
        id: 'job_104',
        title: '数据分析师 人才洞察',
        department: '数据',
        location: '杭州',
        type: '混合办公',
        level: '2-4 年',
        salary: '20k-32k',
        owner: '陈琦',
        summary: '搭建招聘漏斗指标、候选人质量模型与业务人才画像看板。',
        skills: ['SQL', 'Python', '数据分析', 'AI'],
        posted: '今天',
        stage: '新发布',
        status: 'open',
        createdAt: nowLabel(),
      },
      {
        id: 'job_105',
        title: '增长招聘运营经理',
        department: '人力资源',
        location: '上海',
        type: '全职',
        level: '3-5 年',
        salary: '18k-30k',
        owner: '人力资源负责人',
        summary: '负责招聘渠道运营、候选人分层、招聘活动策划与数据复盘。',
        skills: ['招聘', '运营', '数据分析', '项目管理'],
        posted: '昨天',
        stage: '热招',
        status: 'open',
        createdAt: nowLabel(),
      },
      {
        id: 'job_106',
        title: '后端工程师 Node.js',
        department: '技术',
        location: '北京',
        type: '全职',
        level: '3-5 年',
        salary: '26k-42k',
        owner: '林杰',
        summary: '负责招聘系统后端 API、权限、文件解析任务和数据服务。',
        skills: ['Node.js', 'TypeScript', 'SQL', 'SaaS'],
        posted: '4 天前',
        stage: '热招',
        status: 'open',
        createdAt: nowLabel(),
      },
      {
        id: 'job_107',
        title: '企业销售经理 SaaS',
        department: '销售',
        location: '广州',
        type: '混合办公',
        level: '5 年以上',
        salary: '20k-35k',
        owner: '招聘团队',
        summary: '面向中大型企业客户销售招聘管理 SaaS，推动商机转化和续约。',
        skills: ['销售', 'SaaS', '项目管理', '运营'],
        posted: '5 天前',
        stage: '新发布',
        status: 'open',
        createdAt: nowLabel(),
      },
      {
        id: 'job_108',
        title: '机器学习工程师 NLP',
        department: '技术',
        location: '远程',
        type: '远程',
        level: '5 年以上',
        salary: '35k-60k',
        owner: '数据招聘负责人',
        summary: '优化简历解析、岗位理解、候选人排序和面试摘要模型。',
        skills: ['Python', 'NLP', 'AI', 'SQL'],
        posted: '今天',
        stage: '热招',
        status: 'open',
        createdAt: nowLabel(),
      },
      {
        id: 'job_109',
        title: '薪酬绩效专家',
        department: '人力资源',
        location: '成都',
        type: '全职',
        level: '5 年以上',
        salary: '18k-28k',
        owner: '人力资源负责人',
        summary: '负责薪酬体系、绩效校准、职级方案和年度调薪机制。',
        skills: ['薪酬', '绩效', 'HRBP', '数据分析'],
        posted: '1 周前',
        stage: '热招',
        status: 'open',
        createdAt: nowLabel(),
      },
      {
        id: 'job_110',
        title: '用户研究员 AI 产品',
        department: '产品',
        location: '杭州',
        type: '全职',
        level: '2-4 年',
        salary: '18k-30k',
        owner: '周敏',
        summary: '研究求职者和招聘方工作流，沉淀 AI 招聘产品机会点。',
        skills: ['用户研究', '产品设计', 'AI', '数据分析'],
        posted: '2 天前',
        stage: '新发布',
        status: 'paused',
        createdAt: nowLabel(),
      },
    ],
    candidates: [
      {
        id: 'cand_demo',
        userId: candidateUserId,
        name: '候选人演示',
        title: 'AI 产品经理',
        location: '上海',
        experience: '6 年',
        skills: ['产品设计', '用户研究', 'AI', '招聘', 'SaaS'],
        resume:
          '做过简历解析、岗位匹配、招聘漏斗分析，主导过 B 端 SaaS 从 0 到 1。',
        resumeHighlights:
          '6 年 B 端产品经验，做过 AI 简历解析、招聘漏斗分析和 SaaS 增长项目。',
        resumeFile: '',
        status: '已收藏',
        source: '官网投递',
        notes: '产品和招聘场景经验强，建议安排产品负责人复聊。',
      },
      {
        id: 'cand_202',
        name: '李辰',
        title: 'React 前端工程师',
        location: '深圳',
        experience: '4 年',
        skills: ['React', 'TypeScript', 'Node.js', '数据分析'],
        resume: '负责过企业协同平台、权限系统、仪表盘组件和文件上传流程。',
        resumeHighlights: '',
        resumeFile: '',
        status: '已约面',
        source: '内推',
        notes: '组件工程能力稳定，适合前端岗位。',
      },
      {
        id: 'cand_203',
        name: '王嘉宁',
        title: 'HRBP',
        location: '北京',
        experience: '7 年',
        skills: ['HRBP', '绩效', '薪酬', '招聘', '项目管理'],
        resume: '支持 500 人业务团队，熟悉人才盘点、绩效校准与关键岗位招聘。',
        resumeHighlights: '',
        resumeFile: '',
        status: '待筛选',
        source: '猎头推荐',
        notes: '',
      },
      {
        id: 'cand_204',
        name: '周航',
        title: '数据分析师',
        location: '杭州',
        experience: '3 年',
        skills: ['SQL', 'Python', '数据分析', 'NLP', 'AI'],
        resume: '搭建过招聘渠道归因、候选人评分模型和面试转化预测。',
        resumeHighlights: '',
        resumeFile: '',
        status: '待筛选',
        source: '官网投递',
        notes: '',
      },
      {
        id: 'cand_205',
        userId: 'user_candidate_ops',
        name: '唐佳怡',
        title: '招聘运营经理',
        location: '上海',
        experience: '5 年',
        skills: ['招聘', '运营', '数据分析', '项目管理', 'AI'],
        resume: '负责过校园招聘、社招渠道运营、候选人社群和招聘数据复盘。',
        resumeHighlights: '擅长招聘活动运营、渠道 ROI 分析和候选人分层触达。',
        resumeFile: '',
        status: '待筛选',
        source: '注册用户',
        notes: '适合增长招聘运营类岗位。',
      },
      {
        id: 'cand_206',
        userId: 'user_candidate_data',
        name: '郑浩',
        title: '后端工程师',
        location: '北京',
        experience: '4 年',
        skills: ['Node.js', 'TypeScript', 'SQL', 'SaaS'],
        resume: '参与过企业 SaaS 权限、文件上传、异步任务和报表服务建设。',
        resumeHighlights: '熟悉 Node.js、TypeScript、PostgreSQL 和多租户 SaaS 架构。',
        resumeFile: '',
        status: '待筛选',
        source: '官网投递',
        notes: '',
      },
      {
        id: 'cand_207',
        name: '罗雨晴',
        title: '企业销售经理',
        location: '广州',
        experience: '6 年',
        skills: ['销售', 'SaaS', '项目管理', '运营'],
        resume: '长期负责 HR SaaS 大客户销售，熟悉线索跟进、方案演示和合同推进。',
        resumeHighlights: '',
        resumeFile: '',
        status: '已收藏',
        source: '猎头推荐',
        notes: '具备招聘 SaaS 行业经验。',
      },
      {
        id: 'cand_208',
        name: '何书宁',
        title: 'NLP 算法工程师',
        location: '远程',
        experience: '5 年',
        skills: ['Python', 'NLP', 'AI', 'SQL', '数据分析'],
        resume: '负责过文本分类、向量检索、简历标签抽取和候选人排序模型。',
        resumeHighlights: '',
        resumeFile: '',
        status: '已约面',
        source: '内推',
        notes: '算法背景强，建议技术深面。',
      },
      {
        id: 'cand_209',
        name: '孙沐',
        title: '薪酬绩效专家',
        location: '成都',
        experience: '8 年',
        skills: ['薪酬', '绩效', 'HRBP', '数据分析'],
        resume: '搭建过职级、绩效校准、奖金分配和年度调薪机制。',
        resumeHighlights: '',
        resumeFile: '',
        status: '待筛选',
        source: '官网投递',
        notes: '',
      },
      {
        id: 'cand_210',
        name: '高远',
        title: '用户研究员',
        location: '杭州',
        experience: '3 年',
        skills: ['用户研究', '产品设计', 'AI', '数据分析'],
        resume: '做过 B 端访谈、可用性测试、用户旅程地图和产品机会分析。',
        resumeHighlights: '',
        resumeFile: '',
        status: '待筛选',
        source: '官网投递',
        notes: '',
      },
      {
        id: 'cand_211',
        name: '蒋一鸣',
        title: '项目运营经理',
        location: '上海',
        experience: '6 年',
        skills: ['项目管理', '运营', '数据分析', 'SaaS'],
        resume: '负责过跨部门项目推进、运营策略、指标拆解和客户成功协同。',
        resumeHighlights: '',
        resumeFile: '',
        status: '待筛选',
        source: '内推',
        notes: '',
      },
      {
        id: 'cand_212',
        name: '马思源',
        title: '全栈工程师',
        location: '深圳',
        experience: '5 年',
        skills: ['React', 'TypeScript', 'Node.js', 'SQL'],
        resume: '负责过前后端一体化工作台、权限系统、报表和文件处理。',
        resumeHighlights: '',
        resumeFile: '',
        status: '待筛选',
        source: '官网投递',
        notes: '',
      },
    ],
    applications: [
      {
        id: 'app_301',
        jobId: 'job_101',
        candidateId: 'cand_demo',
        status: 'AI 推荐',
        note: '匹配度高，等待业务筛选。',
        createdAt: nowLabel(),
      },
      {
        id: 'app_302',
        jobId: 'job_102',
        candidateId: 'cand_202',
        status: '业务面试',
        note: '前端技能匹配，已安排一面。',
        createdAt: nowLabel(),
      },
      {
        id: 'app_303',
        jobId: 'job_104',
        candidateId: 'cand_204',
        status: 'AI 推荐',
        note: '数据分析与 AI 标签匹配，建议进入筛选。',
        createdAt: nowLabel(),
      },
      {
        id: 'app_304',
        jobId: 'job_105',
        candidateId: 'cand_205',
        status: '已投递',
        note: '候选人有招聘运营和数据复盘经验。',
        createdAt: nowLabel(),
      },
      {
        id: 'app_305',
        jobId: 'job_106',
        candidateId: 'cand_206',
        status: 'AI 推荐',
        note: 'Node.js、TypeScript 和 SQL 命中岗位要求。',
        createdAt: nowLabel(),
      },
      {
        id: 'app_306',
        jobId: 'job_107',
        candidateId: 'cand_207',
        status: '业务面试',
        note: 'SaaS 销售经验强，待业务二面。',
        createdAt: nowLabel(),
      },
      {
        id: 'app_307',
        jobId: 'job_108',
        candidateId: 'cand_208',
        status: 'Offer',
        note: '算法能力突出，已进入 Offer 沟通。',
        createdAt: nowLabel(),
      },
      {
        id: 'app_308',
        jobId: 'job_109',
        candidateId: 'cand_209',
        status: '已投递',
        note: '薪酬绩效经验符合岗位要求。',
        createdAt: nowLabel(),
      },
      {
        id: 'app_309',
        jobId: 'job_110',
        candidateId: 'cand_210',
        status: 'AI 推荐',
        note: '用户研究、产品设计与 AI 标签匹配。',
        createdAt: nowLabel(),
      },
    ],
  }
}

async function ensureDatabase() {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.mkdir(uploadDir, { recursive: true })

  try {
    await fs.access(dbPath)
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(seedDatabase(), null, 2))
  }
}

async function readDb() {
  await ensureDatabase()
  return JSON.parse(await fs.readFile(dbPath, 'utf-8'))
}

async function writeDb(db) {
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2))
}

function publicUser(user) {
  if (!user) {
    return null
  }

  const { passwordHash: _passwordHash, ...safeUser } = user
  return safeUser
}

function withApplicantCounts(jobs, applications) {
  return jobs.map((job) => ({
    ...job,
    applicants: applications.filter((application) => application.jobId === job.id)
      .length,
  }))
}

async function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const userId = token ? sessions.get(token) : null

  if (!userId) {
    return res.status(401).json({ message: '请先登录' })
  }

  const db = await readDb()
  const user = db.users.find((item) => item.id === userId)

  if (!user) {
    return res.status(401).json({ message: '登录已失效' })
  }

  req.user = user
  req.db = db
  next()
}

function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles]

  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: '当前角色无权限操作' })
    }

    next()
  }
}

async function parseResumeFile(file) {
  const extension = path.extname(file.originalname).toLowerCase()

  if (['.txt', '.md', '.csv'].includes(extension) || file.mimetype.startsWith('text/')) {
    return fs.readFile(file.path, 'utf-8')
  }

  if (['.doc', '.docx'].includes(extension)) {
    const result = await mammoth.extractRawText({ path: file.path })
    return result.value
  }

  if (extension === '.pdf') {
    const buffer = await fs.readFile(file.path)
    const module = await import('pdf-parse')
    const pdfParse = module.default ?? module
    const result = await pdfParse(buffer)
    return result.text
  }

  return ''
}

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/bootstrap', async (_req, res) => {
  const db = await readDb()

  res.json({
    jobs: withApplicantCounts(db.jobs, db.applications),
    candidates: db.candidates,
    applications: db.applications,
  })
})

app.post('/api/auth/login', async (req, res) => {
  const db = await readDb()
  const email = String(req.body.email ?? '').trim().toLowerCase()
  const passwordHash = hashPassword(String(req.body.password ?? ''))
  const user = db.users.find(
    (item) => item.email.toLowerCase() === email && item.passwordHash === passwordHash,
  )

  if (!user) {
    return res.status(401).json({ message: '邮箱或密码不正确' })
  }

  if (user.status === 'disabled') {
    return res.status(403).json({ message: '账号已被后台停用' })
  }

  const token = crypto.randomBytes(24).toString('hex')
  sessions.set(token, user.id)

  res.json({ token, user: publicUser(user) })
})

app.post('/api/auth/register', async (req, res) => {
  const db = await readDb()
  const name = String(req.body.name ?? '').trim()
  const email = String(req.body.email ?? '').trim().toLowerCase()
  const password = String(req.body.password ?? '')
  const role = ['candidate', 'recruiter', 'admin'].includes(req.body.role)
    ? req.body.role
    : 'candidate'

  if (!name || !email || password.length < 6) {
    return res.status(400).json({ message: '请填写姓名、邮箱和至少 6 位密码' })
  }

  if (db.users.some((user) => user.email.toLowerCase() === email)) {
    return res.status(409).json({ message: '邮箱已注册' })
  }

  const user = {
    id: id('user'),
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    status: 'active',
  }

  if (role === 'candidate') {
    const candidateId = id('cand')
    user.candidateId = candidateId
    db.candidates.push({
      id: candidateId,
      userId: user.id,
      name,
      title: '求职者',
      location: '远程',
      experience: '待补充',
      skills: [],
      resume: '',
      resumeHighlights: '',
      resumeFile: '',
      status: '待筛选',
      source: '注册用户',
      notes: '',
    })
  }

  db.users.push(user)
  await writeDb(db)

  const token = crypto.randomBytes(24).toString('hex')
  sessions.set(token, user.id)

  res.status(201).json({ token, user: publicUser(user) })
})

app.get('/api/me', auth, (req, res) => {
  const candidate = req.user.candidateId
    ? req.db.candidates.find((item) => item.id === req.user.candidateId)
    : null

  res.json({ user: publicUser(req.user), candidate })
})

app.patch('/api/me/candidate', auth, requireRole('candidate'), async (req, res) => {
  const candidate = req.db.candidates.find(
    (item) => item.id === req.user.candidateId,
  )

  if (!candidate) {
    return res.status(404).json({ message: '候选人档案不存在' })
  }

  const allowedFields = ['name', 'title', 'location', 'experience', 'resumeHighlights']
  allowedFields.forEach((field) => {
    if (typeof req.body[field] === 'string') {
      candidate[field] = req.body[field]
    }
  })

  if (typeof req.body.name === 'string') {
    req.user.name = req.body.name
  }

  const mergedText = `${candidate.resume} ${candidate.resumeHighlights}`
  candidate.skills = uniqSkills([...candidate.skills, ...extractSkills(mergedText)])
  await writeDb(req.db)

  res.json({ user: publicUser(req.user), candidate })
})

app.post(
  '/api/resumes',
  auth,
  requireRole('candidate'),
  upload.single('resume'),
  async (req, res) => {
    const candidate = req.db.candidates.find(
      (item) => item.id === req.user.candidateId,
    )

    if (!candidate || !req.file) {
      return res.status(400).json({ message: '请上传简历文件' })
    }

    try {
      const parsedText = await parseResumeFile(req.file)
      const highlights = String(req.body.highlights ?? '')
      const normalizedFileName = normalizeOriginalName(req.file.originalname)
      const fallbackText = parsedText || `${normalizedFileName} ${highlights}`
      const parsedProfile = deriveResumeProfile(
        `${fallbackText}\n${highlights}`,
        normalizedFileName,
      )
      const skills = uniqSkills([
        ...candidate.skills,
        ...extractSkills(fallbackText),
        ...extractSkills(highlights),
      ])
      const generatedHighlights = highlights
        ? ''
        : deriveResumeHighlights(fallbackText, parsedProfile, skills)

      if (parsedProfile.name) {
        candidate.name = parsedProfile.name
        req.user.name = parsedProfile.name
      }

      if (parsedProfile.title) {
        candidate.title = parsedProfile.title
      }

      if (parsedProfile.location) {
        candidate.location = parsedProfile.location
      }

      if (parsedProfile.experience) {
        candidate.experience = parsedProfile.experience
      }

      candidate.resume = fallbackText
      candidate.resumeHighlights =
        highlights || generatedHighlights || candidate.resumeHighlights
      candidate.resumeFile = parsedProfile.fileName || normalizedFileName
      candidate.skills = skills
      candidate.source = '官网投递'
      await writeDb(req.db)

      res.json({
        candidate,
        parsedLength: fallbackText.length,
        parser: parsedText ? 'document' : 'fallback',
        parsedProfile,
        generatedHighlights,
      })
    } catch (error) {
      res.status(422).json({
        message: '简历解析失败，请换用 TXT/DOCX 或补充简历亮点',
        detail: error instanceof Error ? error.message : String(error),
      })
    } finally {
      await fs.rm(req.file.path, { force: true })
    }
  },
)

app.get('/api/jobs', async (_req, res) => {
  const db = await readDb()
  res.json({ jobs: withApplicantCounts(db.jobs, db.applications) })
})

app.post('/api/jobs', auth, requireRole(['recruiter', 'admin']), async (req, res) => {
  const skills = parseSkills(req.body.skills)

  if (!String(req.body.title ?? '').trim() || skills.length === 0) {
    return res.status(400).json({ message: '岗位名称和核心技能必填' })
  }

  const job = {
    id: id('job'),
    title: String(req.body.title).trim(),
    department: String(req.body.department ?? '产品'),
    location: String(req.body.location ?? '上海'),
    type: String(req.body.type ?? '全职'),
    level: String(req.body.level ?? '3-5 年'),
    salary: String(req.body.salary ?? '').trim() || '面议',
    owner: req.user.name,
    summary:
      String(req.body.summary ?? '').trim() ||
      '新岗位已发布，AI 会按岗位技能自动生成候选人匹配分。',
    skills,
    posted: '刚刚',
    stage: '新发布',
    status: 'open',
    createdAt: nowLabel(),
  }

  req.db.jobs.unshift(job)
  await writeDb(req.db)

  res.status(201).json({
    job: {
      ...job,
      applicants: 0,
    },
  })
})

app.patch('/api/jobs/:id', auth, requireRole(['recruiter', 'admin']), async (req, res) => {
  const job = req.db.jobs.find((item) => item.id === req.params.id)

  if (!job) {
    return res.status(404).json({ message: '岗位不存在' })
  }

  const allowedFields = [
    'title',
    'department',
    'location',
    'type',
    'level',
    'salary',
    'summary',
    'stage',
    'status',
  ]

  allowedFields.forEach((field) => {
    if (typeof req.body[field] === 'string') {
      job[field] = req.body[field]
    }
  })

  if (req.body.skills) {
    job.skills = parseSkills(req.body.skills)
  }

  await writeDb(req.db)

  res.json({
    job: withApplicantCounts([job], req.db.applications)[0],
  })
})

app.delete('/api/jobs/:id', auth, requireRole(['recruiter', 'admin']), async (req, res) => {
  const beforeCount = req.db.jobs.length
  req.db.jobs = req.db.jobs.filter((job) => job.id !== req.params.id)
  req.db.applications = req.db.applications.filter(
    (application) => application.jobId !== req.params.id,
  )

  if (req.db.jobs.length === beforeCount) {
    return res.status(404).json({ message: '岗位不存在' })
  }

  await writeDb(req.db)
  res.status(204).end()
})

app.get('/api/candidates', auth, requireRole(['recruiter', 'admin']), (req, res) => {
  const job = req.db.jobs.find((item) => item.id === req.query.jobId) ?? req.db.jobs[0]
  const minScore = Number(req.query.minScore ?? 0)
  const search = String(req.query.search ?? '').trim().toLowerCase()
  const candidates = req.db.candidates
    .map((candidate) => {
      const match = scoreMatch(
        candidate.skills,
        job,
        `${candidate.resume} ${candidate.resumeHighlights}`,
      )

      return {
        ...candidate,
        score: match.score,
        matchedSkills: match.matchedSkills,
      }
    })
    .filter((candidate) => {
      const matchesScore = candidate.score >= minScore
      const matchesSearch =
        !search ||
        [candidate.name, candidate.title, candidate.location, candidate.source]
          .join(' ')
          .toLowerCase()
          .includes(search)

      return matchesScore && matchesSearch
    })
    .sort((left, right) => right.score - left.score)

  res.json({ candidates })
})

app.patch(
  '/api/candidates/:id',
  auth,
  requireRole(['recruiter', 'admin']),
  async (req, res) => {
    const candidate = req.db.candidates.find((item) => item.id === req.params.id)

    if (!candidate) {
      return res.status(404).json({ message: '候选人不存在' })
    }

    if (typeof req.body.status === 'string') {
      candidate.status = req.body.status
    }

    if (typeof req.body.notes === 'string') {
      candidate.notes = req.body.notes
    }

    await writeDb(req.db)
    res.json({ candidate })
  },
)

app.get('/api/applications', auth, (req, res) => {
  const applications =
    req.user.role === 'candidate'
      ? req.db.applications.filter(
          (application) => application.candidateId === req.user.candidateId,
        )
      : req.db.applications

  res.json({ applications })
})

app.post('/api/applications', auth, requireRole('candidate'), async (req, res) => {
  const job = req.db.jobs.find((item) => item.id === req.body.jobId)
  const candidate = req.db.candidates.find(
    (item) => item.id === req.user.candidateId,
  )

  if (!job || !candidate) {
    return res.status(404).json({ message: '岗位或候选人不存在' })
  }

  if (job.status !== 'open') {
    return res.status(409).json({ message: '该岗位暂不可投递' })
  }

  const existingApplication = req.db.applications.find(
    (application) =>
      application.jobId === job.id && application.candidateId === candidate.id,
  )

  if (existingApplication) {
    return res.json({ application: existingApplication })
  }

  const application = {
    id: id('app'),
    jobId: job.id,
    candidateId: candidate.id,
    status: '已投递',
    note: '候选人已投递，等待招聘方筛选。',
    createdAt: nowLabel(),
  }

  req.db.applications.unshift(application)
  await writeDb(req.db)

  res.status(201).json({ application })
})

app.patch(
  '/api/applications/:id',
  auth,
  requireRole(['recruiter', 'admin']),
  async (req, res) => {
    const application = req.db.applications.find(
      (item) => item.id === req.params.id,
    )

    if (!application) {
      return res.status(404).json({ message: '投递记录不存在' })
    }

    if (typeof req.body.status === 'string') {
      application.status = req.body.status
    }

    if (typeof req.body.note === 'string') {
      application.note = req.body.note
    }

    await writeDb(req.db)
    res.json({ application })
  },
)

app.get('/api/admin/overview', auth, requireRole('admin'), (req, res) => {
  const jobs = withApplicantCounts(req.db.jobs, req.db.applications)

  res.json({
    users: req.db.users.map(publicUser),
    jobs,
    candidates: req.db.candidates,
    applications: req.db.applications,
    metrics: {
      users: req.db.users.length,
      activeUsers: req.db.users.filter((user) => user.status !== 'disabled')
        .length,
      jobs: req.db.jobs.length,
      openJobs: req.db.jobs.filter((job) => job.status === 'open').length,
      candidates: req.db.candidates.length,
      applications: req.db.applications.length,
    },
  })
})

app.patch('/api/admin/users/:id', auth, requireRole('admin'), async (req, res) => {
  const user = req.db.users.find((item) => item.id === req.params.id)

  if (!user) {
    return res.status(404).json({ message: '用户不存在' })
  }

  if (typeof req.body.name === 'string' && req.body.name.trim()) {
    user.name = req.body.name.trim()
  }

  if (['candidate', 'recruiter', 'admin'].includes(req.body.role)) {
    user.role = req.body.role

    if (user.role === 'candidate' && !user.candidateId) {
      const candidateId = id('cand')
      user.candidateId = candidateId
      req.db.candidates.push({
        id: candidateId,
        userId: user.id,
        name: user.name,
        title: '求职者',
        location: '远程',
        experience: '待补充',
        skills: [],
        resume: '',
        resumeHighlights: '',
        resumeFile: '',
        status: '待筛选',
        source: '后台创建',
        notes: '',
      })
    }

    if (user.role !== 'candidate') {
      delete user.candidateId
    }
  }

  if (['active', 'disabled'].includes(req.body.status)) {
    if (user.id === req.user.id && req.body.status === 'disabled') {
      return res.status(409).json({ message: '不能停用当前登录的管理员账号' })
    }

    user.status = req.body.status
  }

  await writeDb(req.db)
  res.json({ user: publicUser(user) })
})

app.use((error, _req, res, _next) => {
  res.status(500).json({
    message: '服务暂时不可用',
    detail: error instanceof Error ? error.message : String(error),
  })
})

await ensureDatabase()

app.listen(port, () => {
  console.log(`HirePilot API listening on http://127.0.0.1:${port}`)
})
