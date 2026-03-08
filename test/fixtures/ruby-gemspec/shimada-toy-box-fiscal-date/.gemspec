# encoding: utf-8
$:.push File.expand_path("../lib", __FILE__)
require "fiscal_date"

Gem::Specification.new do |s|
  s.name        = "fiscal_date"
  s.version     = "0.1.3"
  s.authors     = ["Brian Smith"]
  s.email       = ["bsmith@swig505.com"]
  s.homepage    = "https://github.com/Estimize/fiscal_date"
  s.summary     = %q{Ruby gem for working with fiscal dates}
  s.description = %q{Ruby gem for working with fiscal dates}

  s.files         = `git ls-files`.split("\n")
  s.test_files    = `git ls-files -- {test,spec,features}/*`.split("\n")
  s.executables   = `git ls-files -- bin/*`.split("\n").map{ |f| File.basename(f) }
  s.require_paths = ["lib"]

  s.add_development_dependency('rake')
  s.add_development_dependency('minitest', [">= 2.6.2"])
end
