# -*- encoding: utf-8 -*-
$:.push File.expand_path("../lib", __FILE__)
require "I/version"

Gem::Specification.new do |s|
  s.name        = "I"
  s.version     = I::VERSION
  s.authors     = ["George Drummond"]
  s.email       = ["georgedrummond@gmail.com"]
  s.homepage    = ""
  s.summary     = %q{Record my time}
  s.description = %q{Record my time}

  s.rubyforge_project = "I"

  s.files         = `git ls-files`.split("\n")
  s.test_files    = `git ls-files -- {test,spec,features}/*`.split("\n")
  s.executables   = `git ls-files -- bin/*`.split("\n").map{ |f| File.basename(f) }
  s.require_paths = ["lib"]

  # specify any dependencies here; for example:
  # s.add_development_dependency "rspec"
  # s.add_runtime_dependency "rest-client"
end
