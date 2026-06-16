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
      const fallbackText = parsedText || `${req.file.originalname} ${highlights}`
      const skills = uniqSkills([
        ...candidate.skills,
        ...extractSkills(fallbackText),
        ...extractSkills(highlights),
      ])

      candidate.resume = fallbackText
      candidate.resumeHighlights = highlights || candidate.resumeHighlights
      candidate.resumeFile = req.file.originalname
      candidate.skills = skills
      candidate.source = '官网投递'
      await writeDb(req.db)

      res.json({
        candidate,
        parsedLength: fallbackText.length,
        parser: parsedText ? 'document' : 'fallback',
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
