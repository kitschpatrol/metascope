# -*- encoding: utf-8 -*-
$:.push File.expand_path("../lib", __FILE__)
require "pot/version"

Gem::Specification.new do |s|
  s.name        = "pot"
  s.version     = Pot::VERSION
  s.authors     = ["Rubem Nakamura","Pedro Nascimento", "Lucas Torri"]
  s.email       = ["rubem@gmail.com", "pnascimento@gmail.com", "lucastorri@gmail.com"]
  s.homepage    = "https://github.com/ltorri/pot"
  s.summary     = %q{Page objects!}

  s.rubyforge_project = "pot"

  s.files         = `git ls-files`.split("\n")
  s.test_files    = `git ls-files -- {test,spec,features}/*`.split("\n")
  s.executables   = `git ls-files -- bin/*`.split("\n").map{ |f| File.basename(f) }
  s.require_paths = ["lib"]

  s.add_runtime_dependency "rubigen"
  s.add_runtime_dependency "bundler"
  s.add_runtime_dependency "activesupport"

  s.add_development_dependency "rake"
  s.add_development_dependency "rspec"

  # specify any dependencies here; for example:
  # s.add_development_dependency "rspec"
  # s.add_runtime_dependency "rest-client"
end
