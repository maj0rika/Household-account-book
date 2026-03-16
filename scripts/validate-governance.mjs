import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const historyDir = path.join(rootDir, "docs", "history");
const pipelineStateDir = path.join(rootDir, "docs", "pipeline-state");
const implementationPlanPath = path.join(rootDir, "docs", "implementation-plan.md");
const claudeSkillsDir = path.join(rootDir, ".claude", "skills");
const agentsSkillsDir = path.join(rootDir, ".agents", "skills");

const CANONICAL_HISTORY_TYPES = new Set(["feature", "fix", "refactor", "perf", "config", "remove", "docs"]);
const LEGACY_HISTORY_TYPES = new Set(["start", "progress", "complete", "change", "issue"]);
const PRESERVED_DUPLICATE_HISTORY_FILES = new Set([
	"2026-02-24-04-phase2-db-orm-complete.md",
	"2026-02-24-04-phase3-auth-progress.md",
	"2026-03-10-21-minimax-fireworks-kimi-routing.md",
	"2026-03-10-21-parse-unified-dead-code-removal.md",
]);
const REQUIRED_PIPELINE_SECTIONS = [
	"## Pipeline State",
	"### 요청 요약",
	"### 수용 기준",
	"### 활성 Phase",
	"### 스킵 Phase",
	"### 승인 이력",
	"### 변경 패킷",
	"### 리뷰 이슈",
	"### QA 상태",
	"### PM 최종 판정",
	"### 다음 액션",
];
const HISTORY_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})-(\d{2})-(.+)\.md$/;

function listFiles(dirPath) {
	return readdirSync(dirPath)
		.filter((name) => statSync(path.join(dirPath, name)).isFile())
		.sort();
}

function parseFrontmatter(filePath) {
	const text = readFileSync(filePath, "utf8");
	if (!text.startsWith("---\n")) {
		throw new Error("frontmatter가 없습니다.");
	}

	const endIndex = text.indexOf("\n---\n", 4);
	if (endIndex === -1) {
		throw new Error("frontmatter 종료 구분자가 없습니다.");
	}

	const block = text.slice(4, endIndex).trim().split("\n");
	const frontmatter = {};
	for (const line of block) {
		const separatorIndex = line.indexOf(":");
		if (separatorIndex === -1) {
			continue;
		}
		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1).trim();
		frontmatter[key] = value;
	}

	return frontmatter;
}

function ensure(condition, message, errors) {
	if (!condition) {
		errors.push(message);
	}
}

function validateHistory(errors) {
	const historyFiles = listFiles(historyDir);
	const sequenceGroups = new Map();

	for (const fileName of historyFiles) {
		const filePath = path.join(historyDir, fileName);
		const match = fileName.match(HISTORY_FILE_PATTERN);
		ensure(Boolean(match), `[history] 잘못된 파일명: ${fileName}`, errors);
		if (!match) {
			continue;
		}

		const [, day, sequence] = match;

		let frontmatter;
		try {
			frontmatter = parseFrontmatter(filePath);
		} catch (error) {
			errors.push(`[history] ${fileName}: ${error.message}`);
			continue;
		}

		ensure(Boolean(frontmatter.date), `[history] ${fileName}: date가 없습니다.`, errors);
		ensure(Boolean(frontmatter.type), `[history] ${fileName}: type이 없습니다.`, errors);
		if (frontmatter.type) {
			const isAllowed =
				CANONICAL_HISTORY_TYPES.has(frontmatter.type) || LEGACY_HISTORY_TYPES.has(frontmatter.type);
			ensure(
				isAllowed,
				`[history] ${fileName}: 허용되지 않은 type입니다 (${frontmatter.type}).`,
				errors,
			);
		}

		const groupKey = `${day}-${sequence}`;
		const entries = sequenceGroups.get(groupKey) ?? [];
		entries.push({ fileName, type: frontmatter.type ?? "" });
		sequenceGroups.set(groupKey, entries);
	}

	for (const [groupKey, entries] of sequenceGroups.entries()) {
		if (entries.length > 1) {
			const preservedDuplicateGroup = entries.every(
				(entry) =>
					LEGACY_HISTORY_TYPES.has(entry.type) || PRESERVED_DUPLICATE_HISTORY_FILES.has(entry.fileName),
			);
			ensure(
				preservedDuplicateGroup,
				`[history] ${groupKey}: 중복 순번 예외로 허용되지 않은 파일이 있습니다 (${entries
					.map((entry) => entry.fileName)
					.join(", ")}).`,
				errors,
			);
		}
	}

	return historyFiles;
}

function validateImplementationPlan(historyFiles, errors) {
	const implementationPlanText = readFileSync(implementationPlanPath, "utf8");
	for (const fileName of historyFiles) {
		ensure(
			implementationPlanText.includes(`./history/${fileName}`),
			`[implementation-plan] 히스토리 링크 누락: ${fileName}`,
			errors,
		);
	}
}

function validatePipelineStates(errors) {
	const stateFiles = listFiles(pipelineStateDir).filter((fileName) => fileName !== "README.md");
	for (const fileName of stateFiles) {
		const text = readFileSync(path.join(pipelineStateDir, fileName), "utf8");
		for (const section of REQUIRED_PIPELINE_SECTIONS) {
			ensure(text.includes(section), `[pipeline-state] ${fileName}: 섹션 누락 ${section}`, errors);
		}
	}
}

function validateSkills(errors) {
	const claudeSkillNames = readdirSync(claudeSkillsDir)
		.filter((name) => statSync(path.join(claudeSkillsDir, name)).isDirectory())
		.sort();

	ensure(
		existsSync(path.join(agentsSkillsDir, "reviewer", "SKILL.md")),
		"[skills] .agents/skills/reviewer/SKILL.md 가 없습니다.",
		errors,
	);

	for (const skillName of claudeSkillNames) {
		const claudeSkillPath = path.join(claudeSkillsDir, skillName, "SKILL.md");
		const agentsSkillPath = path.join(agentsSkillsDir, skillName, "SKILL.md");
		ensure(existsSync(agentsSkillPath), `[skills] .agents 대응 스킬 누락: ${skillName}`, errors);
		if (!existsSync(agentsSkillPath)) {
			continue;
		}

		const claudeText = readFileSync(claudeSkillPath, "utf8");
		const agentsText = readFileSync(agentsSkillPath, "utf8");
		ensure(
			claudeText === agentsText,
			`[skills] .claude 와 .agents 내용 불일치: ${skillName}`,
			errors,
		);
	}
}

function main() {
	const errors = [];
	const historyFiles = validateHistory(errors);
	validateImplementationPlan(historyFiles, errors);
	validatePipelineStates(errors);
	validateSkills(errors);

	if (errors.length > 0) {
		console.error("거버넌스 검증 실패:");
		for (const error of errors) {
			console.error(`- ${error}`);
		}
		process.exit(1);
	}

	console.log("거버넌스 검증 통과");
}

main();
