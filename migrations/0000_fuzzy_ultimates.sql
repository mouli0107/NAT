CREATE TABLE "accessibility_scan_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"overall_score" integer,
	"violations_count" integer DEFAULT 0,
	"passes_count" integer DEFAULT 0,
	"incomplete_count" integer DEFAULT 0,
	"inapplicable_count" integer DEFAULT 0,
	"critical_count" integer DEFAULT 0,
	"serious_count" integer DEFAULT 0,
	"moderate_count" integer DEFAULT 0,
	"minor_count" integer DEFAULT 0,
	"violations" jsonb,
	"passes" jsonb,
	"incomplete" jsonb,
	"wcag_criteria" jsonb,
	"metadata" jsonb,
	"screen_reader_result" jsonb,
	"visual_test_result" jsonb,
	"ai_analysis" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ado_configurations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization" text NOT NULL,
	"project" text NOT NULL,
	"pat" text NOT NULL,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_baseline_executions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baseline_id" varchar NOT NULL,
	"status" text NOT NULL,
	"status_code" integer,
	"response_time" integer,
	"actual_response" jsonb,
	"differences" jsonb,
	"summary" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_baselines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"method" text NOT NULL,
	"endpoint" text NOT NULL,
	"request_headers" jsonb,
	"request_body" text,
	"baseline_response" jsonb,
	"baseline_status_code" integer,
	"baseline_headers" jsonb,
	"response_schema" jsonb,
	"last_executed_at" timestamp,
	"last_execution_status" text,
	"execution_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_discovery_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar,
	"project_id" varchar,
	"discovery_type" text NOT NULL,
	"source_url" text,
	"spec_content" jsonb,
	"endpoints" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_test_cases" (
	"id" varchar PRIMARY KEY NOT NULL,
	"run_id" varchar NOT NULL,
	"title" text NOT NULL,
	"priority" text NOT NULL,
	"category" text NOT NULL,
	"page_url" text,
	"description" text,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"expected_result" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_test_executions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar NOT NULL,
	"script_id" varchar,
	"status" text DEFAULT 'running' NOT NULL,
	"total" integer DEFAULT 0,
	"passed" integer DEFAULT 0,
	"failed" integer DEFAULT 0,
	"skipped" integer DEFAULT 0,
	"results" jsonb DEFAULT '[]'::jsonb,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "auto_test_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"forms" integer DEFAULT 0,
	"buttons" integer DEFAULT 0,
	"inputs" integer DEFAULT 0,
	"links" integer DEFAULT 0,
	"dom_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_test_runs" (
	"id" varchar PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'crawling' NOT NULL,
	"page_count" integer DEFAULT 0,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "auto_test_scripts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar NOT NULL,
	"content" text NOT NULL,
	"test_case_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_scripts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar,
	"project_id" varchar,
	"script_type" text NOT NULL,
	"pattern" text NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"content" text NOT NULL,
	"page_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bdd_feature_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"test_case_id" varchar,
	"test_case_source" text DEFAULT 'functional',
	"feature_name" text NOT NULL,
	"file_name" text NOT NULL,
	"content" text NOT NULL,
	"language" text DEFAULT 'gherkin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bdd_step_definitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"feature_file_id" varchar,
	"step_def_name" text NOT NULL,
	"file_name" text NOT NULL,
	"content" text NOT NULL,
	"language" text DEFAULT 'typescript' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"user_id" varchar NOT NULL,
	"token_hash" text NOT NULL,
	"device_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "device_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "execution_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_case_id" varchar NOT NULL,
	"status" text NOT NULL,
	"execution_time" integer NOT NULL,
	"screenshot_url" text,
	"error_log" text,
	"console_errors" jsonb,
	"network_errors" jsonb,
	"actual_result" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_run_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar NOT NULL,
	"test_case_id" varchar NOT NULL,
	"test_case_source" text DEFAULT 'functional' NOT NULL,
	"test_name" text NOT NULL,
	"category" text DEFAULT 'functional' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"duration" integer DEFAULT 0,
	"step_results" jsonb DEFAULT '[]'::jsonb,
	"final_screenshot_path" text,
	"error_message" text,
	"console_errors" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"run_name" text NOT NULL,
	"browser" text DEFAULT 'chromium' NOT NULL,
	"execution_mode" text DEFAULT 'headless' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_tests" integer DEFAULT 0 NOT NULL,
	"passed_tests" integer DEFAULT 0,
	"failed_tests" integer DEFAULT 0,
	"skipped_tests" integer DEFAULT 0,
	"duration" integer DEFAULT 0,
	"video_path" text,
	"agent_logs" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "framework_configs" (
	"id" varchar PRIMARY KEY NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"framework" text NOT NULL,
	"language" text NOT NULL,
	"description" text,
	"is_global" boolean DEFAULT false,
	"base_class" text,
	"sample_script" text,
	"detected_pattern" text,
	"detected_language" text,
	"detected_tool" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "framework_files" (
	"id" varchar PRIMARY KEY NOT NULL,
	"config_id" varchar NOT NULL,
	"filename" text NOT NULL,
	"file_hash" text,
	"content" text NOT NULL,
	"file_type" text NOT NULL,
	"parsed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "framework_functions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"config_id" varchar NOT NULL,
	"name" text NOT NULL,
	"signature" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"return_type" text DEFAULT 'void',
	"parameters" jsonb DEFAULT '[]'::jsonb,
	"source_file" text,
	"class_name" text,
	"import_path" text,
	"is_custom" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "functional_test_run_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar NOT NULL,
	"test_id" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"objective" text,
	"preconditions" jsonb DEFAULT '[]'::jsonb,
	"test_steps" jsonb NOT NULL,
	"expected_result" text NOT NULL,
	"test_data" jsonb,
	"priority" text DEFAULT 'P2',
	"status" text DEFAULT 'generated',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "functional_test_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"website_url" text NOT NULL,
	"test_focus" text DEFAULT 'all' NOT NULL,
	"domain" text DEFAULT 'general',
	"product_context" text,
	"sample_mode" text DEFAULT 'comprehensive',
	"status" text DEFAULT 'running' NOT NULL,
	"total_test_cases" integer DEFAULT 0,
	"workflow_cases" integer DEFAULT 0,
	"functional_cases" integer DEFAULT 0,
	"negative_cases" integer DEFAULT 0,
	"edge_cases" integer DEFAULT 0,
	"text_validation_cases" integer DEFAULT 0,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "functional_test_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"url" text NOT NULL,
	"test_focus" text NOT NULL,
	"crawl_status" text DEFAULT 'pending' NOT NULL,
	"pages_visited" integer DEFAULT 0,
	"workflows_discovered" integer DEFAULT 0,
	"test_cases_generated" integer DEFAULT 0,
	"test_cases_passed" integer DEFAULT 0,
	"test_cases_failed" integer DEFAULT 0,
	"crawl_progress" jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "har_captures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discovery_run_id" varchar,
	"url" text NOT NULL,
	"method" text NOT NULL,
	"request_headers" jsonb,
	"request_body" text,
	"status_code" integer,
	"response_headers" jsonb,
	"response_body" text,
	"duration" integer,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"platform" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"status" text DEFAULT 'not_configured' NOT NULL,
	"last_synced_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jira_test_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jira_project_key" text NOT NULL,
	"jira_board_id" integer,
	"jira_sprint_id" integer,
	"jira_story_id" text NOT NULL,
	"jira_story_title" text NOT NULL,
	"test_case_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"objective" text,
	"preconditions" jsonb DEFAULT '[]'::jsonb,
	"test_steps" jsonb NOT NULL,
	"expected_result" text,
	"postconditions" jsonb DEFAULT '[]'::jsonb,
	"test_data" jsonb,
	"test_type" text DEFAULT 'functional',
	"category" text DEFAULT 'functional' NOT NULL,
	"priority" text DEFAULT 'P2',
	"playwright_script" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(64) DEFAULT 'default-tenant' NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"domain" text DEFAULT 'insurance',
	"product_description" text,
	"website_url" text,
	"application_type" text DEFAULT 'web_portal',
	"ado_enabled" integer DEFAULT 0,
	"ado_connection_id" varchar,
	"ado_project_id" text,
	"ado_project_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_validations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"source_filename" text NOT NULL,
	"target_filename" text NOT NULL,
	"source_file_type" text NOT NULL,
	"target_file_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" text,
	"match_percentage" integer,
	"config" jsonb,
	"summary" jsonb,
	"ai_analysis" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responsive_test_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"overall_score" integer,
	"devices_tested_count" integer DEFAULT 0,
	"passed_devices_count" integer DEFAULT 0,
	"failed_devices_count" integer DEFAULT 0,
	"device_results" jsonb,
	"layout_issues" jsonb,
	"touch_target_issues" jsonb,
	"performance_metrics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprint_test_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sprint_id" varchar,
	"sprint_user_story_id" varchar,
	"user_story_id" varchar,
	"test_case_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"objective" text,
	"preconditions" jsonb DEFAULT '[]'::jsonb,
	"test_steps" jsonb NOT NULL,
	"expected_result" text,
	"postconditions" jsonb DEFAULT '[]'::jsonb,
	"test_data" jsonb,
	"test_type" text DEFAULT 'functional',
	"category" text DEFAULT 'functional' NOT NULL,
	"priority" text DEFAULT 'P2',
	"status" text DEFAULT 'draft',
	"edit_status" text DEFAULT 'original',
	"is_edited" integer DEFAULT 0,
	"linked_acceptance_criteria" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"original_version" jsonb,
	"change_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprint_user_stories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sprint_id" varchar NOT NULL,
	"ado_work_item_id" integer,
	"title" text NOT NULL,
	"description" text,
	"acceptance_criteria" text,
	"story_points" integer,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'new',
	"source" text DEFAULT 'manual',
	"assigned_to" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"ado_url" text,
	"ado_sync_status" text DEFAULT 'not_synced',
	"ado_last_sync_at" timestamp,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"additional_context" text,
	"context_documents" jsonb DEFAULT '[]'::jsonb,
	"context_urls" jsonb DEFAULT '[]'::jsonb,
	"generated_test_cases" jsonb,
	"test_case_count" integer DEFAULT 0,
	"generated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"goal" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" text DEFAULT 'planning',
	"ado_sync_enabled" integer DEFAULT 0,
	"ado_backlog_source" text DEFAULT 'sprint_backlog',
	"ado_iteration_path" text,
	"ado_area_path" text,
	"ado_wiql_query" text,
	"ado_work_item_types" jsonb DEFAULT '["User Story"]'::jsonb,
	"ado_sync_frequency" text DEFAULT 'manual',
	"ado_last_sync_at" timestamp,
	"ado_sync_status" text DEFAULT 'not_synced',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "synthetic_data_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"project_id" varchar,
	"domain" text NOT NULL,
	"sub_domain" text NOT NULL,
	"record_count" integer DEFAULT 100 NOT NULL,
	"data_prefix" text,
	"masking_enabled" integer DEFAULT 0 NOT NULL,
	"selected_fields" jsonb DEFAULT '[]'::jsonb,
	"generated_data" jsonb,
	"metadata" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"storage_connection_string" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" varchar NOT NULL,
	"test_id" text NOT NULL,
	"name" text NOT NULL,
	"objective" text NOT NULL,
	"given" text NOT NULL,
	"when" text NOT NULL,
	"then" text NOT NULL,
	"selector" text,
	"preconditions" jsonb DEFAULT '[]'::jsonb,
	"test_steps" jsonb NOT NULL,
	"postconditions" jsonb DEFAULT '[]'::jsonb,
	"test_data" jsonb,
	"test_type" text DEFAULT 'Functional' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'P2',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"completion_time" integer NOT NULL,
	"design_compliance" integer NOT NULL,
	"accessibility_warnings" integer NOT NULL,
	"test_cases_generated" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"figma_url" text NOT NULL,
	"website_url" text NOT NULL,
	"test_scope" text NOT NULL,
	"browser_target" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tasks" jsonb DEFAULT '[]'::jsonb,
	"metrics" jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" varchar NOT NULL,
	"ado_work_item_id" integer,
	"title" text NOT NULL,
	"description" text,
	"acceptance_criteria" text,
	"state" text,
	"assigned_to" text,
	"sprint" text,
	"area_path" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"ado_url" text,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_stories_ado_work_item_id_unique" UNIQUE("ado_work_item_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(64) DEFAULT 'default-tenant' NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"allowed_modules" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "validation_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"validation_id" varchar NOT NULL,
	"row_number" integer,
	"column_name" text,
	"sheet_name" text,
	"source_value" text,
	"target_value" text,
	"difference" text,
	"percent_diff" text,
	"match_status" text NOT NULL,
	"ai_analysis" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visual_diffs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" varchar NOT NULL,
	"area" text NOT NULL,
	"count" integer NOT NULL,
	"severity" text NOT NULL,
	"screenshot_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visual_regression_baselines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"viewport" text DEFAULT 'desktop' NOT NULL,
	"viewport_width" integer DEFAULT 1920,
	"viewport_height" integer DEFAULT 1080,
	"baseline_image_url" text,
	"baseline_image_data" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visual_regression_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baseline_id" varchar,
	"project_id" varchar,
	"status" text DEFAULT 'pending' NOT NULL,
	"diff_percentage" integer,
	"ssim_score" integer,
	"psnr_score" integer,
	"mse_score" integer,
	"pixels_different" integer,
	"total_pixels" integer,
	"current_image_data" text,
	"diff_image_data" text,
	"differences" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"workflow_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"entry_point" text NOT NULL,
	"steps" jsonb NOT NULL,
	"confidence" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accessibility_scan_results" ADD CONSTRAINT "accessibility_scan_results_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_baseline_executions" ADD CONSTRAINT "api_baseline_executions_baseline_id_api_baselines_id_fk" FOREIGN KEY ("baseline_id") REFERENCES "public"."api_baselines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_discovery_runs" ADD CONSTRAINT "api_discovery_runs_run_id_functional_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."functional_test_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_discovery_runs" ADD CONSTRAINT "api_discovery_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_test_cases" ADD CONSTRAINT "auto_test_cases_run_id_auto_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."auto_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_test_executions" ADD CONSTRAINT "auto_test_executions_run_id_auto_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."auto_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_test_executions" ADD CONSTRAINT "auto_test_executions_script_id_auto_test_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."auto_test_scripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_test_pages" ADD CONSTRAINT "auto_test_pages_run_id_auto_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."auto_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_test_scripts" ADD CONSTRAINT "auto_test_scripts_run_id_auto_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."auto_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_scripts" ADD CONSTRAINT "automation_scripts_run_id_functional_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."functional_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_scripts" ADD CONSTRAINT "automation_scripts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bdd_feature_files" ADD CONSTRAINT "bdd_feature_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bdd_step_definitions" ADD CONSTRAINT "bdd_step_definitions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bdd_step_definitions" ADD CONSTRAINT "bdd_step_definitions_feature_file_id_bdd_feature_files_id_fk" FOREIGN KEY ("feature_file_id") REFERENCES "public"."bdd_feature_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_results" ADD CONSTRAINT "execution_results_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_run_tests" ADD CONSTRAINT "execution_run_tests_run_id_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."execution_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_runs" ADD CONSTRAINT "execution_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "functional_test_run_cases" ADD CONSTRAINT "functional_test_run_cases_run_id_functional_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."functional_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "functional_test_runs" ADD CONSTRAINT "functional_test_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "functional_test_sessions" ADD CONSTRAINT "functional_test_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "har_captures" ADD CONSTRAINT "har_captures_discovery_run_id_api_discovery_runs_id_fk" FOREIGN KEY ("discovery_run_id") REFERENCES "public"."api_discovery_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsive_test_results" ADD CONSTRAINT "responsive_test_results_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_test_cases" ADD CONSTRAINT "sprint_test_cases_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_test_cases" ADD CONSTRAINT "sprint_test_cases_sprint_user_story_id_sprint_user_stories_id_fk" FOREIGN KEY ("sprint_user_story_id") REFERENCES "public"."sprint_user_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_test_cases" ADD CONSTRAINT "sprint_test_cases_user_story_id_user_stories_id_fk" FOREIGN KEY ("user_story_id") REFERENCES "public"."user_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_user_stories" ADD CONSTRAINT "sprint_user_stories_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synthetic_data_jobs" ADD CONSTRAINT "synthetic_data_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synthetic_data_jobs" ADD CONSTRAINT "synthetic_data_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stories" ADD CONSTRAINT "user_stories_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_validation_id_report_validations_id_fk" FOREIGN KEY ("validation_id") REFERENCES "public"."report_validations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_diffs" ADD CONSTRAINT "visual_diffs_result_id_test_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."test_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_regression_baselines" ADD CONSTRAINT "visual_regression_baselines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_regression_results" ADD CONSTRAINT "visual_regression_results_baseline_id_visual_regression_baselines_id_fk" FOREIGN KEY ("baseline_id") REFERENCES "public"."visual_regression_baselines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_regression_results" ADD CONSTRAINT "visual_regression_results_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_session_id_functional_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."functional_test_sessions"("id") ON DELETE cascade ON UPDATE no action;