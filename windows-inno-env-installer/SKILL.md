---
name: windows-inno-env-installer
description: >-
  Package portable tool folders (Maven, JDK, Node, etc.) into Windows Inno Setup
  EXE installers with HKCU env vars, silent Java detection, optional JDK 8/21
  download. Use when user asks to 打包 exe, 安装包, Inno Setup, 环境变量安装器,
  毕设环境一键安装, or one-shot build without installer errors.
---

# Windows Inno 环境安装包（一次打包成功）

目标：**一次执行构建脚本即产出可安装的 EXE**，避免常见编译/运行期错误。

## 开工前（必须）

1. 确认 **Inno Setup 6** 已安装；`ISCC.exe` 位于其一：
   - `%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe`
   - `C:\Program Files (x86)\Inno Setup 6\ISCC.exe`
2. 若用简体中文界面，确认存在：
   - `%LOCALAPPDATA%\Programs\Inno Setup 6\Languages\ChineseSimplified.isl`
   - 缺失则从 [jrsoftware/issrc](https://github.com/jrsoftware/issrc) 下载 `Languages/Unofficial/ChineseSimplified.isl`
3. **源目录完整**（以 Maven 为例）：
   - 必有 `bin\mvn.cmd`
   - `lib\` 下必有 `maven-*.jar`（仅 `.license` 不够；从官方 bin.zip 补全）
4. 镜像/配置写在源目录内（如 `conf\settings.xml`），安装器**原样打包**，不在运行时改

## 推荐目录结构

```
项目根/
├── 工具目录/              # 如 apache-maven-3.8
├── installer/
│   ├── app-installer.iss
│   └── scripts/
│       ├── install-jdk.ps1   # 可复制本 skill 内 scripts/install-jdk.ps1
│       └── preflight.ps1
├── build-installer.bat
└── dist/
    └── *-Setup.exe
```

## ISS 硬性规则（违反易翻车）

| 规则 | 原因 |
|------|------|
| `AppId={{GUID}}` 双花括号闭合 | 少 `}` 编译失败 |
| **不要**在 `InitializeSetup` 里用 `WizardForm` / `WizardSelectTasks` | 运行时报 WizardForm 未创建 |
| `WizardSelectTasks` 放在 `InitializeWizard` | 同上 |
| JDK 页用 `CreateInputOptionPage(wpSelectDir, ...)` | 顺序：选路径 → Java → 任务 → 安装 |
| `ShouldSkipPage(JdkPage)`：`IsJavaInstalled()` 为真则 **跳过** JDK 页 | 静默检测，有 Java 不打扰 |
| **不要**在 `PrepareToInstall` 里检查 `{app}\lib\*.jar` | 此时尚未复制文件，必误报阻断 |
| `[Code]` 里避免变量名 `Label` | Inno 保留，用 `JdkLabel` 等 |
| 完成页文案在 `ssPostInstall` **结束后** 调 `UpdateFinishedPage` | 否则环境配置摘要为空 |
| `UsePreviousAppDir=no` + `DisableDirPage=no` | 每次可选安装路径 |
| `PrivilegesRequired=lowest`，环境变量写 **HKCU** | 无需管理员 |

## Java / JDK 逻辑（默认）

1. `IsJavaInstalled()`：`java -version` 有输出即视为已安装（**含 JDK 8**）
2. 无 Java → 显示 JDK 页：21（默认）/ 8 / 不安装
3. 下载用 Adoptium API（ISS 内 `#define`）：
   - JDK 21：`https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk`
   - JDK 8：`https://api.adoptium.net/v3/binary/latest/8/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk`
4. `install-jdk.ps1`：下载 zip → 解压 → 写 `JAVA_HOME` + 用户 `Path`
5. 工具环境变量：先检测再写入，避免 Path 重复追加

## 一次打包流程

```bat
powershell -File installer\scripts\preflight.ps1 -ProjectRoot .
build-installer.bat
dir dist\*-Setup.exe
```

预检脚本见本 skill 目录 `scripts/preflight.ps1`；失败则**不要**编译。

## 完成页文案

约 5 行：安装目录、环境状态、Java 一行、`mvn -version` 提示、镜像说明。避免多段重复。

## 无法保证 100% 的情况

- 未安装 Inno Setup
- 源目录缺 jar
- JDK 自动下载无网络
- 用户 Path 超过 2048 字符

## 本仓库附带脚本

- `scripts/preflight.ps1`：编译前检查
- `scripts/install-jdk.ps1`：安装阶段下载配置 JDK 模板
