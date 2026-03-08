# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'things/issues_diff/version'

Gem::Specification.new do |spec|
  spec.name          = "things-issues-diff"
  spec.version       = Things::IssuesDiff::VERSION
  spec.authors       = ["KOSEKI Kengo"]
  spec.email         = ["koseki@gmail.com"]

  spec.summary       = %q{Get diff between Things3 tasks and GitHub issues}
  spec.description   = %q{Get diff between Things3 tasks and GitHub issues}
  spec.homepage      = "https://example.com"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").reject do |f|
    f.match(%r{^(test|spec|features)/})
  end
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_dependency "octokit", "~> 4.15"
  spec.add_development_dependency "bundler", "~> 1.13"
  spec.add_development_dependency "rake", "~> 10.0"
  spec.add_development_dependency "awesome_print"
  spec.add_development_dependency "rubocop"
end
