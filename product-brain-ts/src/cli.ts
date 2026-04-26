#!/usr/bin/env node
// Port target: ../product-brain/src/product_brain/cli.py
import { Command } from "commander";

const program = new Command();
program
  .name("product-brain")
  .description("Cross-repo memory + planning over a ticket-keyed code index.")
  .version("0.1.0-ts.0");

program.command("init").description("bootstrap a brain repo (TODO)").action(() => {
  console.log("TODO: port init_brain.py");
});

program.command("bind <source>").description("bind a source repo (TODO)").action(() => {
  console.log("TODO: port bind.py");
});

program.command("backfill").description("rebuild ticket records (TODO)").action(() => {
  console.log("TODO: port backfill/run.py");
});

program.parse();
