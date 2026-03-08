# -*- encoding: utf-8 -*-
$:.push File.expand_path("../lib", __FILE__)

Gem::Specification.new do |s|
  s.name        = "contractor"
  s.version     = "0.0.1"
  s.platform    = Gem::Platform::RUBY
  s.authors     = ["Michael Stämpfli"]
  s.email       = ["michael.staempfli@garaio.com"]
  s.homepage    = "http://rubygems.org/gems/contractor"
  s.summary     = %q{This library adds design by contract to ruby}
  s.description = %q{TODO: Write a gem description}

  s.rubyforge_project = "contractor"

  s.files         = `git ls-files`.split("\n")
  s.test_files    = `git ls-files -- {test,spec,features}/*`.split("\n")
  s.executables   = `git ls-files -- bin/*`.split("\n").map{ |f| File.basename(f) }
  s.require_paths = ["lib"]
end
