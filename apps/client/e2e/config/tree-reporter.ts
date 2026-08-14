import type { FullConfig, Reporter, Suite, TestCase, TestError, TestResult } from "@playwright/test/reporter";
import readline from "node:readline";

type TestStatus = TestResult["status"];

type ProgressStatus = "running" | TestStatus;

interface ProgressTest {
  index: number;
  projectName: string;
  path: string;
  status: ProgressStatus;
  duration?: number;
}

interface ProjectResult {
  projectName: string;
  status: TestStatus;
}

interface TestEntry {
  title: string;
  line: number;
  results: ProjectResult[];
}

interface SuiteNode {
  title: string;
  order: number;
  tests: Map<string, TestEntry>;
  children: Map<string, SuiteNode>;
}

interface FailureEntry {
  index: number;
  projectName: string;
  path: string;
  error?: TestError;
}

const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const magenta = (text: string) => `\x1b[35m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;
const dim = (text: string) => `\x1b[2m${text}\x1b[0m`;

const getStatusIcon = (status: ProgressStatus) => {
  switch (status) {
    case "running":
      return dim("·");
    case "passed":
      return green("✓");
    case "skipped":
      return yellow("-");
    default:
      return red("✘");
  }
};

const getProjectName = (projectName: string) => {
  switch (projectName) {
    case "chromium":
      return cyan(projectName);
    case "firefox":
      return magenta(projectName);
    case "webkit":
      return blue(projectName);
    default:
      return projectName;
  }
};

const formatDuration = (duration: number) => {
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(1)}s`;
};

class TreeReporter implements Reporter {
  private renderedProgressLineCount = 0;
  private testIndexes = new Map<string, number>();
  private progressTests = new Map<string, ProgressTest>();
  private fileOrder = new Map<string, number>();
  private projectOrder: string[] = [];
  private failures: FailureEntry[] = [];
  private workers = 1;
  private root: SuiteNode = {
    title: "",
    order: 0,
    tests: new Map(),
    children: new Map(),
  };

  onBegin(config: FullConfig, suite: Suite) {
    this.workers = config.workers;
    this.projectOrder = config.projects.map((project) => project.name);

    const tests = suite.allTests();
    tests.forEach((test, index) => {
      this.testIndexes.set(test.id, index + 1);
      const titlePath = this.getLogicalTitlePath(test);
      const file = titlePath[0];
      if (file && !this.fileOrder.has(file)) {
        this.fileOrder.set(file, this.fileOrder.size);
      }
    });

    console.log(`Running ${tests.length} tests using ${config.workers} workers`);
    console.log();

    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[?25l");
    }
  }

  onTestBegin(test: TestCase) {
    const index = this.testIndexes.get(test.id) ?? 0;

    this.progressTests.set(test.id, {
      index,
      projectName: this.getTestProjectName(test),
      path: this.getTestPath(test),
      status: "running",
    });

    this.renderProgress();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const progress = this.progressTests.get(test.id);
    if (progress) {
      progress.status = result.status;
      progress.duration = result.duration;
    }

    this.collectResult(test, result);
    if (result.status !== "passed" && result.status !== "skipped") {
      this.failures.push({
        index: this.testIndexes.get(test.id) ?? 0,
        projectName: this.getTestProjectName(test),
        path: this.getTestPath(test),
        error: result.error,
      });
    }
    this.renderProgress();
  }

  onEnd() {
    this.clearProgress();
    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[?25h");
    }
    this.printTree();
    this.printSummary();
    this.printFailures();
  }

  printsToStdio() {
    return true;
  }

  private renderProgress() {
    if (!process.stdout.isTTY) return;

    this.clearProgress();
    const tests = [...this.progressTests.values()];
    const runningTests = tests.filter((test) => test.status === "running").sort((a, b) => a.index - b.index);
    const completedTests = tests.filter((test) => test.status !== "running").sort((a, b) => a.index - b.index);
    const maxVisible = Math.max(this.workers * 2, 10);
    const completedVisibleCount = Math.max(maxVisible - runningTests.length, 0);
    const visibleCompleted = completedTests.slice(-completedVisibleCount);
    const visibleTests = [...visibleCompleted, ...runningTests].sort((a, b) => a.index - b.index);

    for (const test of visibleTests) {
      const index = test.index.toString().padStart(3);
      const prefix = `  ${getStatusIcon(test.status)} ` + `${index} ` + `[${test.projectName}] › ` + `${test.path}`;
      if (test.status === "running") {
        console.log(dim(prefix));
        continue;
      }
      console.log(`${prefix} ` + dim(`(${formatDuration(test.duration ?? 0)})`));
    }

    this.renderedProgressLineCount = visibleTests.length;
  }

  private clearProgress() {
    if (!process.stdout.isTTY || this.renderedProgressLineCount === 0) return;

    readline.moveCursor(process.stdout, 0, -this.renderedProgressLineCount);
    readline.cursorTo(process.stdout, 0);
    readline.clearScreenDown(process.stdout);
    this.renderedProgressLineCount = 0;
  }

  private collectResult(test: TestCase, result: TestResult) {
    const projectName = this.getTestProjectName(test);
    const titlePath = this.getLogicalTitlePath(test);
    const file = titlePath[0];
    const testTitle = titlePath.at(-1);
    if (!file || !testTitle) return;

    const suiteTitles = titlePath.slice(1, -1);
    let currentNode = this.getOrCreateChild(this.root, file, this.fileOrder.get(file) ?? Number.MAX_SAFE_INTEGER);
    for (const suiteTitle of suiteTitles) {
      currentNode = this.getOrCreateChild(currentNode, suiteTitle, test.location.line);
    }

    const existing = currentNode.tests.get(testTitle) ?? {
      title: testTitle,
      line: test.location.line,
      results: [],
    };

    const resultIndex = existing.results.findIndex((projectResult) => projectResult.projectName === projectName);
    const projectResult: ProjectResult = {
      projectName,
      status: result.status,
    };
    if (resultIndex === -1) {
      existing.results.push(projectResult);
    } else {
      existing.results[resultIndex] = projectResult;
    }

    currentNode.tests.set(testTitle, existing);
  }

  private getOrCreateChild(parent: SuiteNode, title: string, order: number): SuiteNode {
    const existing = parent.children.get(title);
    if (existing) {
      existing.order = Math.min(existing.order, order);
      return existing;
    }

    const child: SuiteNode = {
      title,
      order,
      tests: new Map(),
      children: new Map(),
    };
    parent.children.set(title, child);

    return child;
  }

  private printTree() {
    console.log(bold("Test Results"));
    console.log();

    const files = [...this.root.children.values()].sort((a, b) => a.order - b.order);
    for (const file of files) {
      this.printNode(file, 0);
      console.log();
    }
  }

  private printNode(node: SuiteNode, depth: number) {
    const indent = "  ".repeat(depth);
    if (depth === 0) {
      console.log(dim(node.title));
    } else {
      console.log(`${indent}${bold(node.title)}`);
    }

    const tests = [...node.tests.values()].sort((a, b) => a.line - b.line);
    for (const test of tests) {
      const results = [...test.results].sort((a, b) => this.getProjectIndex(a.projectName) - this.getProjectIndex(b.projectName));
      const allPassed = results.every(({ status }) => status === "passed");
      const allSkipped = results.every(({ status }) => status === "skipped");
      const overallIcon = allPassed ? green("✓") : allSkipped ? yellow("-") : red("✘");
      const projects = results.map(({ projectName, status }) => `${getProjectName(projectName)} ${getStatusIcon(status)}`).join(", ");
      console.log(`${"  ".repeat(depth + 1)}` + `${overallIcon} ` + `${test.title} ` + `[${projects}]`);
    }

    const children = [...node.children.values()].sort((a, b) => a.order - b.order);
    for (const child of children) {
      this.printNode(child, depth + 1);
    }
  }

  private printSummary() {
    const runs = this.getAllTests(this.root).flatMap((test) => test.results);
    const passed = runs.filter(({ status }) => status === "passed").length;
    const skipped = runs.filter(({ status }) => status === "skipped").length;
    const failed = runs.filter(({ status }) => status !== "passed" && status !== "skipped").length;
    const summary = [
      passed > 0 ? green(`${passed} passed`) : null,
      skipped > 0 ? yellow(`${skipped} skipped`) : null,
      failed > 0 ? red(`${failed} failed`) : null,
    ].filter((value): value is string => value !== null);
    console.log(summary.join(", "));
  }

  private printFailures() {
    if (this.failures.length === 0) return;
    console.log();
    console.log(bold(red("Failures")));

    const failures = [...this.failures].sort((a, b) => a.index - b.index);
    failures.forEach((failure, index) => {
      console.log();
      console.log(`${index + 1}) ` + `[${getProjectName(failure.projectName)}] › ` + `${failure.path}`);

      const message = failure.error?.message;
      if (message) {
        console.log();
        console.log(red(message));
      }

      const stack = failure.error?.stack;
      if (stack && stack !== message) {
        console.log();
        console.log(dim(stack));
      }
    });
  }

  private getAllTests(node: SuiteNode): TestEntry[] {
    return [...node.tests.values(), ...[...node.children.values()].flatMap((child) => this.getAllTests(child))];
  }

  private getTestProjectName(test: TestCase) {
    return test.parent.project()?.name ?? "unknown";
  }

  private getLogicalTitlePath(test: TestCase) {
    const projectName = this.getTestProjectName(test);
    const titlePath = test.titlePath().filter(Boolean);

    if (titlePath[0] === projectName) return titlePath.slice(1);
    return titlePath;
  }

  private getTestPath(test: TestCase) {
    return this.getLogicalTitlePath(test).join(" › ");
  }

  private getProjectIndex(projectName: string) {
    const index = this.projectOrder.indexOf(projectName);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }
}

export default TreeReporter;
