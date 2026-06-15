import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  UserRound,
} from 'lucide-react'
import './App.css'

type Role = 'candidate' | 'recruiter'

type Job = {
  id: number
  title: string
  department: string
  location: string
  type: string
  level: string
  salary: string
  owner: string
  summary: string
  skills: string[]
  posted: string
  applicants: number
  stage: '热招' | '终面' | '新发布'
}

type Candidate = {
  id: number
  name: string
  title: string
  location: string
  experience: string
  skills: string[]
  resume: string
  status: '待筛选' | '已约面' | '已收藏'
  source: string
}

type ResumeProfile = {
  name: string
  fileName: string
  fileSize: string
  text: string
  skills: string[]
}

type JobForm = {
  title: string
  department: string
  location: string
  type: string
  level: string
  salary: string
  skills: string
  summary: string
}

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

const initialJobs: Job[] = [
  {
    id: 101,
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
    applicants: 42,
    stage: '热招',
  },
  {
    id: 102,
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
    applicants: 36,
    stage: '终面',
  },
  {
    id: 103,
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
    applicants: 28,
    stage: '热招',
  },
  {
    id: 104,
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
    applicants: 19,
    stage: '新发布',
  },
]

const initialCandidates: Candidate[] = [
  {
    id: 201,
    name: '许安琪',
    title: 'AI 产品经理',
    location: '上海',
    experience: '6 年',
    skills: ['产品设计', '用户研究', 'AI', '招聘', 'SaaS'],
    resume: '做过简历解析、岗位匹配、招聘漏斗分析，主导过 B 端 SaaS 从 0 到 1。',
    status: '已收藏',
    source: '官网投递',
  },
  {
    id: 202,
    name: '李辰',
    title: 'React 前端工程师',
    location: '深圳',
    experience: '4 年',
    skills: ['React', 'TypeScript', 'Node.js', '数据分析'],
    resume: '负责过企业协同平台、权限系统、仪表盘组件和文件上传流程。',
    status: '已约面',
    source: '内推',
  },
  {
    id: 203,
    name: '王嘉宁',
    title: 'HRBP',
    location: '北京',
    experience: '7 年',
    skills: ['HRBP', '绩效', '薪酬', '招聘', '项目管理'],
    resume: '支持 500 人业务团队，熟悉人才盘点、绩效校准与关键岗位招聘。',
    status: '待筛选',
    source: '猎头推荐',
  },
  {
    id: 204,
    name: '周航',
    title: '数据分析师',
    location: '杭州',
    experience: '3 年',
    skills: ['SQL', 'Python', '数据分析', 'NLP', 'AI'],
    resume: '搭建过招聘渠道归因、候选人评分模型和面试转化预测。',
    status: '待筛选',
    source: '官网投递',
  },
]

const defaultResume: ResumeProfile = {
  name: '候选人',
  fileName: '',
  fileSize: '',
  text: 'React TypeScript AI SaaS 招聘 产品设计 数据分析',
  skills: ['React', 'TypeScript', 'AI', 'SaaS', '招聘', '产品设计', '数据分析'],
}

const defaultJobForm: JobForm = {
  title: '',
  department: '产品',
  location: '上海',
  type: '全职',
  level: '3-5 年',
  salary: '',
  skills: '',
  summary: '',
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function extractSkills(text: string) {
  const normalizedText = text.toLowerCase()

  return skillDictionary.filter((skill) =>
    normalizedText.includes(skill.toLowerCase()),
  )
}

function uniqSkills(skills: string[]) {
  return Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean)))
}

function scoreMatch(candidateSkills: string[], job: Job, resumeText = '') {
  const matchedSkills = job.skills.filter((skill) =>
    candidateSkills.some(
      (candidateSkill) =>
        candidateSkill.toLowerCase() === skill.toLowerCase() ||
        candidateSkill.toLowerCase().includes(skill.toLowerCase()),
    ),
  )
  const skillScore = Math.round((matchedSkills.length / job.skills.length) * 72)
  const textBonus = job.skills.reduce((total, skill) => {
    return resumeText.toLowerCase().includes(skill.toLowerCase())
      ? total + 4
      : total
  }, 0)
  const coverageBonus = candidateSkills.length >= 5 ? 12 : 6

  return {
    score: Math.min(99, skillScore + textBonus + coverageBonus),
    matchedSkills,
  }
}

function App() {
  const [activeRole, setActiveRole] = useState<Role>('candidate')
  const [jobs, setJobs] = useState(initialJobs)
  const [resumeProfile, setResumeProfile] = useState(defaultResume)
  const [resumeHighlights, setResumeHighlights] = useState(
    '6 年 B 端产品经验，做过 AI 简历解析、招聘漏斗分析和 SaaS 增长项目。',
  )
  const [targetJobId, setTargetJobId] = useState(initialJobs[0].id)
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('全部城市')
  const [departmentFilter, setDepartmentFilter] = useState('全部部门')
  const [skillFilter, setSkillFilter] = useState('全部技能')
  const [jobForm, setJobForm] = useState(defaultJobForm)
  const [screeningJobId, setScreeningJobId] = useState(initialJobs[0].id)
  const [minScore, setMinScore] = useState(70)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [savedCandidates, setSavedCandidates] = useState<number[]>([201])

  const cities = useMemo(
    () => ['全部城市', ...Array.from(new Set(jobs.map((job) => job.location)))],
    [jobs],
  )
  const departments = useMemo(
    () => [
      '全部部门',
      ...Array.from(new Set(jobs.map((job) => job.department))),
    ],
    [jobs],
  )
  const allSkills = useMemo(
    () => ['全部技能', ...Array.from(new Set(jobs.flatMap((job) => job.skills)))],
    [jobs],
  )

  const visibleJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return jobs.filter((job) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [job.title, job.department, job.summary, job.location]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      const matchesLocation =
        locationFilter === '全部城市' || job.location === locationFilter
      const matchesDepartment =
        departmentFilter === '全部部门' || job.department === departmentFilter
      const matchesSkill =
        skillFilter === '全部技能' || job.skills.includes(skillFilter)

      return (
        matchesQuery && matchesLocation && matchesDepartment && matchesSkill
      )
    })
  }, [departmentFilter, jobs, locationFilter, query, skillFilter])

  const selectedTargetJob =
    jobs.find((job) => job.id === targetJobId) ?? initialJobs[0]
  const candidateMatch = scoreMatch(
    uniqSkills([
      ...resumeProfile.skills,
      ...extractSkills(resumeHighlights),
    ]),
    selectedTargetJob,
    `${resumeProfile.text} ${resumeHighlights}`,
  )

  const screeningJob = jobs.find((job) => job.id === screeningJobId) ?? jobs[0]
  const screenedCandidates = useMemo(() => {
    const normalizedCandidateQuery = candidateSearch.trim().toLowerCase()

    return initialCandidates
      .map((candidate) => {
        const match = scoreMatch(candidate.skills, screeningJob, candidate.resume)

        return {
          ...candidate,
          score: match.score,
          matchedSkills: match.matchedSkills,
        }
      })
      .filter((candidate) => {
        const matchesScore = candidate.score >= minScore
        const matchesQuery =
          normalizedCandidateQuery.length === 0 ||
          [candidate.name, candidate.title, candidate.location, candidate.source]
            .join(' ')
            .toLowerCase()
            .includes(normalizedCandidateQuery)

        return matchesScore && matchesQuery
      })
      .sort((left, right) => right.score - left.score)
  }, [candidateSearch, minScore, screeningJob])

  function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const content =
        typeof reader.result === 'string'
          ? reader.result
          : `${file.name} ${resumeHighlights}`
      const skills = uniqSkills([
        ...extractSkills(content),
        ...extractSkills(file.name),
        ...extractSkills(resumeHighlights),
      ])

      setResumeProfile({
        name: resumeProfile.name,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        text: content,
        skills: skills.length > 0 ? skills : resumeProfile.skills,
      })
    }

    if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
      reader.readAsText(file)
    } else {
      reader.readAsText(new Blob([`${file.name} ${resumeHighlights}`]))
    }
  }

  function handleJobSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextSkills = uniqSkills(
      jobForm.skills
        .split(/[,，、\n]/)
        .map((skill) => skill.trim())
        .filter(Boolean),
    )

    if (!jobForm.title.trim() || nextSkills.length === 0) {
      return
    }

    const nextJob: Job = {
      id: Date.now(),
      title: jobForm.title.trim(),
      department: jobForm.department,
      location: jobForm.location,
      type: jobForm.type,
      level: jobForm.level,
      salary: jobForm.salary.trim() || '面议',
      owner: '招聘团队',
      summary:
        jobForm.summary.trim() ||
        '新岗位已发布，AI 会按岗位技能自动生成候选人匹配分。',
      skills: nextSkills,
      posted: '刚刚',
      applicants: 0,
      stage: '新发布',
    }

    setJobs((currentJobs) => [nextJob, ...currentJobs])
    setScreeningJobId(nextJob.id)
    setTargetJobId(nextJob.id)
    setMinScore(50)
    setJobForm(defaultJobForm)
  }

  function updateJobForm(field: keyof JobForm, value: string) {
    setJobForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function toggleSavedCandidate(candidateId: number) {
    setSavedCandidates((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId],
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup" aria-label="HirePilot AI">
          <span className="brand-mark">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">AI 招聘工作台</p>
            <h1>HirePilot AI</h1>
          </div>
        </div>
        <nav className="role-switch" aria-label="角色切换">
          <button
            className={activeRole === 'candidate' ? 'active' : ''}
            type="button"
            onClick={() => setActiveRole('candidate')}
          >
            <UserRound size={18} aria-hidden="true" />
            求职者
          </button>
          <button
            className={activeRole === 'recruiter' ? 'active' : ''}
            type="button"
            onClick={() => setActiveRole('recruiter')}
          >
            <Building2 size={18} aria-hidden="true" />
            招聘方
          </button>
        </nav>
      </header>

      <main>
        <section className="summary-band" aria-label="招聘概览">
          <div className="metric">
            <span>活跃岗位</span>
            <strong>{jobs.length}</strong>
          </div>
          <div className="metric">
            <span>候选人库</span>
            <strong>{initialCandidates.length + 1}</strong>
          </div>
          <div className="metric">
            <span>平均匹配</span>
            <strong>86%</strong>
          </div>
          <div className="visual-tile">
            <img
              src="https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&w=900&q=80"
              alt="招聘团队在工作台上协作分析候选人数据"
            />
            <div>
              <span>今日推荐</span>
              <strong>{screenedCandidates[0]?.name ?? '暂无候选人'}</strong>
            </div>
          </div>
        </section>

        {activeRole === 'candidate' ? (
          <section className="workspace" aria-label="求职者工作台">
            <aside className="tool-panel profile-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Candidate</p>
                  <h2>简历与匹配</h2>
                </div>
                <BadgeCheck size={22} aria-hidden="true" />
              </div>

              <label className="field">
                <span>姓名</span>
                <input
                  value={resumeProfile.name}
                  onChange={(event) =>
                    setResumeProfile((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="upload-zone">
                <UploadCloud size={28} aria-hidden="true" />
                <span>上传简历</span>
                <strong>{resumeProfile.fileName || 'PDF / DOC / TXT'}</strong>
                <small>{resumeProfile.fileSize || '本地解析技能关键词'}</small>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={handleResumeUpload}
                />
              </label>

              <label className="field">
                <span>简历亮点</span>
                <textarea
                  value={resumeHighlights}
                  onChange={(event) => setResumeHighlights(event.target.value)}
                  rows={5}
                />
              </label>

              <div className="score-block">
                <div>
                  <span>目标岗位匹配分</span>
                  <strong>{candidateMatch.score}</strong>
                </div>
                <meter min="0" max="100" value={candidateMatch.score} />
                <div className="chip-row">
                  {candidateMatch.matchedSkills.map((skill) => (
                    <span className="chip matched" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </aside>

            <section className="content-panel" aria-label="岗位搜索">
              <div className="panel-heading split">
                <div>
                  <p className="eyebrow">Jobs</p>
                  <h2>岗位搜寻</h2>
                </div>
                <div className="inline-field search-field">
                  <Search size={18} aria-hidden="true" />
                  <input
                    placeholder="搜索岗位、城市、部门"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="filter-bar" aria-label="岗位筛选">
                <label>
                  <MapPin size={16} aria-hidden="true" />
                  <select
                    value={locationFilter}
                    onChange={(event) => setLocationFilter(event.target.value)}
                  >
                    {cities.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <BriefcaseBusiness size={16} aria-hidden="true" />
                  <select
                    value={departmentFilter}
                    onChange={(event) =>
                      setDepartmentFilter(event.target.value)
                    }
                  >
                    {departments.map((department) => (
                      <option key={department}>{department}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <Filter size={16} aria-hidden="true" />
                  <select
                    value={skillFilter}
                    onChange={(event) => setSkillFilter(event.target.value)}
                  >
                    {allSkills.map((skill) => (
                      <option key={skill}>{skill}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="job-grid">
                {visibleJobs.map((job) => {
                  const match = scoreMatch(
                    uniqSkills([
                      ...resumeProfile.skills,
                      ...extractSkills(resumeHighlights),
                    ]),
                    job,
                    `${resumeProfile.text} ${resumeHighlights}`,
                  )

                  return (
                    <article className="job-card" key={job.id}>
                      <div className="card-topline">
                        <span>{job.stage}</span>
                        <span>{job.posted}</span>
                      </div>
                      <h3>{job.title}</h3>
                      <p>{job.summary}</p>
                      <div className="meta-line">
                        <span>
                          <MapPin size={15} aria-hidden="true" />
                          {job.location}
                        </span>
                        <span>
                          <Clock3 size={15} aria-hidden="true" />
                          {job.type}
                        </span>
                        <span>{job.salary}</span>
                      </div>
                      <div className="chip-row">
                        {job.skills.map((skill) => (
                          <span
                            className={
                              match.matchedSkills.includes(skill)
                                ? 'chip matched'
                                : 'chip'
                            }
                            key={skill}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div className="card-action">
                        <div>
                          <span>AI 匹配</span>
                          <strong>{match.score}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTargetJobId(job.id)}
                        >
                          <ChevronRight size={18} aria-hidden="true" />
                          投递
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          </section>
        ) : (
          <section className="workspace recruiter-workspace" aria-label="招聘方工作台">
            <aside className="tool-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Recruiter</p>
                  <h2>岗位发布</h2>
                </div>
                <Plus size={22} aria-hidden="true" />
              </div>

              <form className="job-form" onSubmit={handleJobSubmit}>
                <label className="field">
                  <span>岗位名称</span>
                  <input
                    value={jobForm.title}
                    onChange={(event) =>
                      updateJobForm('title', event.target.value)
                    }
                    placeholder="例如：增长产品经理"
                  />
                </label>

                <div className="field-grid">
                  <label className="field">
                    <span>部门</span>
                    <select
                      value={jobForm.department}
                      onChange={(event) =>
                        updateJobForm('department', event.target.value)
                      }
                    >
                      <option>产品</option>
                      <option>技术</option>
                      <option>人力资源</option>
                      <option>数据</option>
                      <option>销售</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>城市</span>
                    <select
                      value={jobForm.location}
                      onChange={(event) =>
                        updateJobForm('location', event.target.value)
                      }
                    >
                      <option>上海</option>
                      <option>北京</option>
                      <option>深圳</option>
                      <option>杭州</option>
                      <option>远程</option>
                    </select>
                  </label>
                </div>

                <div className="field-grid">
                  <label className="field">
                    <span>类型</span>
                    <select
                      value={jobForm.type}
                      onChange={(event) =>
                        updateJobForm('type', event.target.value)
                      }
                    >
                      <option>全职</option>
                      <option>混合办公</option>
                      <option>远程</option>
                      <option>实习</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>经验</span>
                    <select
                      value={jobForm.level}
                      onChange={(event) =>
                        updateJobForm('level', event.target.value)
                      }
                    >
                      <option>应届</option>
                      <option>1-3 年</option>
                      <option>3-5 年</option>
                      <option>5 年以上</option>
                      <option>中高级</option>
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>薪资</span>
                  <input
                    value={jobForm.salary}
                    onChange={(event) =>
                      updateJobForm('salary', event.target.value)
                    }
                    placeholder="例如：25k-40k"
                  />
                </label>

                <label className="field">
                  <span>核心技能</span>
                  <input
                    value={jobForm.skills}
                    onChange={(event) =>
                      updateJobForm('skills', event.target.value)
                    }
                    placeholder="React, TypeScript, AI"
                  />
                </label>

                <label className="field">
                  <span>岗位描述</span>
                  <textarea
                    value={jobForm.summary}
                    onChange={(event) =>
                      updateJobForm('summary', event.target.value)
                    }
                    rows={4}
                  />
                </label>

                <button className="primary-action" type="submit">
                  <Plus size={18} aria-hidden="true" />
                  发布岗位
                </button>
              </form>
            </aside>

            <section className="content-panel" aria-label="简历筛选">
              <div className="panel-heading split">
                <div>
                  <p className="eyebrow">Screening</p>
                  <h2>简历筛选</h2>
                </div>
                <div className="inline-field search-field">
                  <Search size={18} aria-hidden="true" />
                  <input
                    placeholder="搜索候选人"
                    value={candidateSearch}
                    onChange={(event) => setCandidateSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="screening-controls">
                <label>
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  <select
                    value={screeningJobId}
                    onChange={(event) =>
                      setScreeningJobId(Number(event.target.value))
                    }
                  >
                    {jobs.map((job) => (
                      <option value={job.id} key={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="range-field">
                  <span>最低分 {minScore}</span>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={minScore}
                    onChange={(event) => setMinScore(Number(event.target.value))}
                  />
                </label>
              </div>

              <div className="candidate-list">
                {screenedCandidates.length === 0 ? (
                  <div className="empty-state">
                    <FileText size={28} aria-hidden="true" />
                    <strong>暂无符合条件的简历</strong>
                    <span>降低最低分或更换岗位后继续筛选</span>
                  </div>
                ) : (
                  screenedCandidates.map((candidate) => (
                  <article className="candidate-card" key={candidate.id}>
                    <div className="candidate-avatar" aria-hidden="true">
                      {candidate.name.slice(0, 1)}
                    </div>
                    <div className="candidate-main">
                      <div className="candidate-heading">
                        <div>
                          <h3>{candidate.name}</h3>
                          <p>
                            {candidate.title} · {candidate.location} ·{' '}
                            {candidate.experience}
                          </p>
                        </div>
                        <span className="source-pill">{candidate.source}</span>
                      </div>
                      <p className="resume-line">{candidate.resume}</p>
                      <div className="chip-row">
                        {candidate.skills.map((skill) => (
                          <span
                            className={
                              candidate.matchedSkills.includes(skill)
                                ? 'chip matched'
                                : 'chip'
                            }
                            key={skill}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="candidate-score">
                      <span>匹配分</span>
                      <strong>{candidate.score}</strong>
                      <meter min="0" max="100" value={candidate.score} />
                      <button
                        type="button"
                        className={
                          savedCandidates.includes(candidate.id)
                            ? 'saved'
                            : ''
                        }
                        onClick={() => toggleSavedCandidate(candidate.id)}
                      >
                        <CheckCircle2 size={18} aria-hidden="true" />
                        {savedCandidates.includes(candidate.id)
                          ? '已收藏'
                          : '收藏'}
                      </button>
                    </div>
                  </article>
                  ))
                )}
              </div>
            </section>
          </section>
        )}

        <section className="pipeline-band" aria-label="招聘漏斗">
          {['新简历', 'AI 推荐', '业务面试', 'Offer'].map((stage, index) => (
            <div className="pipeline-step" key={stage}>
              <FileText size={18} aria-hidden="true" />
              <span>{stage}</span>
              <strong>{[34, 18, 9, 3][index]}</strong>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}

export default App
